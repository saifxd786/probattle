-- =====================================================
-- LUDO MULTI-PLAYER SUPPORT (1v1, 1v1v1, 1v1v1v1)
-- =====================================================

-- Step 1: Add player_count column to ludo_rooms
ALTER TABLE public.ludo_rooms 
ADD COLUMN IF NOT EXISTS player_count INTEGER NOT NULL DEFAULT 2;

-- Step 2: Create ludo_room_players table for tracking multiple players
CREATE TABLE IF NOT EXISTS public.ludo_room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.ludo_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  player_color VARCHAR(10) NOT NULL,
  slot_index INTEGER NOT NULL, -- 0, 1, 2, or 3
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_ready BOOLEAN DEFAULT false,
  UNIQUE(room_id, slot_index),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on ludo_room_players
ALTER TABLE public.ludo_room_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for ludo_room_players
CREATE POLICY "Users can view room players"
  ON public.ludo_room_players FOR SELECT
  USING (true);

CREATE POLICY "Users can join rooms"
  ON public.ludo_room_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status"
  ON public.ludo_room_players FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for ludo_room_players
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_room_players;

-- Step 3: Create function to create multi-player room
CREATE OR REPLACE FUNCTION public.create_ludo_room_multiplayer(
  p_entry_amount INTEGER,
  p_player_count INTEGER DEFAULT 2
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance NUMERIC;
  v_wager_requirement NUMERIC;
  v_room_code TEXT;
  v_room_id UUID;
  v_reward_amount INTEGER;
  v_new_wager NUMERIC;
  v_player_color VARCHAR(10);
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Validate player count (2, 3, or 4)
  IF p_player_count NOT IN (2, 3, 4) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid player count. Must be 2, 3, or 4');
  END IF;
  
  -- Only check wallet balance if not a free match
  IF p_entry_amount > 0 THEN
    SELECT wallet_balance, COALESCE(wager_requirement, 0) INTO v_wallet_balance, v_wager_requirement 
    FROM profiles WHERE id = v_user_id;
    
    IF COALESCE(v_wallet_balance, 0) < p_entry_amount THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient balance');
    END IF;
  END IF;
  
  -- Generate room code
  v_room_code := generate_room_code();
  
  -- Calculate reward based on player count:
  -- 2 players: 1.5x of total pool (2 * entry * 1.5)
  -- 3 players: 2.25x for winner (3 * entry * 0.75 platform takes 25%)
  -- 4 players: 2.5x for winner (4 * entry * 0.625 platform takes ~37.5%)
  IF p_entry_amount > 0 THEN
    IF p_player_count = 2 THEN
      v_reward_amount := (p_entry_amount * 2 * 1.5)::INTEGER;
    ELSIF p_player_count = 3 THEN
      v_reward_amount := (p_entry_amount * 3 * 0.9)::INTEGER; -- 2.7x for winner
    ELSE -- 4 players
      v_reward_amount := (p_entry_amount * 4 * 0.75)::INTEGER; -- 3x for winner
    END IF;
  ELSE
    v_reward_amount := 0;
  END IF;
  
  -- Assign host color based on player count
  -- 2 players: red vs green
  -- 3 players: red, green, yellow
  -- 4 players: red, green, yellow, blue
  v_player_color := 'red'; -- Host is always red
  
  -- Deduct entry amount if not free
  IF p_entry_amount > 0 THEN
    v_new_wager := GREATEST(0, COALESCE(v_wager_requirement, 0) - p_entry_amount);
    
    UPDATE profiles 
    SET wallet_balance = wallet_balance - p_entry_amount,
        wager_requirement = v_new_wager
    WHERE id = v_user_id;
    
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'entry_fee', p_entry_amount, 'completed', 'Ludo Room Entry: ' || v_room_code);
  END IF;
  
  -- Create room with player_count
  INSERT INTO ludo_rooms (room_code, host_id, entry_amount, reward_amount, player_count, host_color)
  VALUES (v_room_code, v_user_id, p_entry_amount, v_reward_amount, p_player_count, v_player_color)
  RETURNING id INTO v_room_id;
  
  -- Add host to room_players table
  INSERT INTO ludo_room_players (room_id, user_id, player_color, slot_index, is_ready)
  VALUES (v_room_id, v_user_id, v_player_color, 0, true);
  
  RETURN json_build_object(
    'success', true,
    'room_id', v_room_id,
    'room_code', v_room_code,
    'entry_amount', p_entry_amount,
    'reward_amount', v_reward_amount,
    'player_count', p_player_count,
    'player_color', v_player_color
  );
END;
$$;

-- Step 4: Create function to join multi-player room
CREATE OR REPLACE FUNCTION public.join_ludo_room_multiplayer(p_room_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance NUMERIC;
  v_wager_requirement NUMERIC;
  v_room RECORD;
  v_new_wager NUMERIC;
  v_current_players INTEGER;
  v_next_slot INTEGER;
  v_player_color VARCHAR(10);
  v_all_ready BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Find room (waiting OR ready for multi-player rooms that aren't full yet)
  SELECT * INTO v_room 
  FROM ludo_rooms 
  WHERE room_code = UPPER(p_room_code) 
    AND status IN ('waiting', 'ready');
  
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or already started');
  END IF;
  
  -- Can't join own room
  IF v_room.host_id = v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot join your own room');
  END IF;
  
  -- Check if user already in room
  IF EXISTS (SELECT 1 FROM ludo_room_players WHERE room_id = v_room.id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Already in this room');
  END IF;
  
  -- Count current players
  SELECT COUNT(*) INTO v_current_players FROM ludo_room_players WHERE room_id = v_room.id;
  
  -- Check if room is full
  IF v_current_players >= v_room.player_count THEN
    RETURN json_build_object('success', false, 'message', 'Room is full');
  END IF;
  
  -- Check wallet balance if not free
  IF v_room.entry_amount > 0 THEN
    SELECT wallet_balance, COALESCE(wager_requirement, 0) INTO v_wallet_balance, v_wager_requirement 
    FROM profiles WHERE id = v_user_id;
    
    IF COALESCE(v_wallet_balance, 0) < v_room.entry_amount THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient balance. Need ₹' || v_room.entry_amount);
    END IF;
    
    -- Deduct entry
    v_new_wager := GREATEST(0, COALESCE(v_wager_requirement, 0) - v_room.entry_amount);
    
    UPDATE profiles 
    SET wallet_balance = wallet_balance - v_room.entry_amount,
        wager_requirement = v_new_wager
    WHERE id = v_user_id;
    
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'entry_fee', v_room.entry_amount, 'completed', 'Ludo Room Join: ' || v_room.room_code);
  END IF;
  
  -- Determine next slot and color
  v_next_slot := v_current_players; -- 0-indexed
  
  -- Color assignment: red(0), green(1), yellow(2), blue(3)
  v_player_color := CASE v_next_slot
    WHEN 0 THEN 'red'
    WHEN 1 THEN 'green'
    WHEN 2 THEN 'yellow'
    WHEN 3 THEN 'blue'
  END;
  
  -- Add player to room
  INSERT INTO ludo_room_players (room_id, user_id, player_color, slot_index, is_ready)
  VALUES (v_room.id, v_user_id, v_player_color, v_next_slot, true);
  
  -- Check if room is now full
  v_current_players := v_current_players + 1;
  
  IF v_current_players >= v_room.player_count THEN
    -- Room is full, set to ready
    UPDATE ludo_rooms 
    SET status = 'ready', guest_id = v_user_id, guest_color = v_player_color, updated_at = now()
    WHERE id = v_room.id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'room_id', v_room.id,
    'room_code', v_room.room_code,
    'entry_amount', v_room.entry_amount,
    'reward_amount', v_room.reward_amount,
    'player_count', v_room.player_count,
    'current_players', v_current_players,
    'player_color', v_player_color,
    'slot_index', v_next_slot,
    'host_id', v_room.host_id,
    'is_full', v_current_players >= v_room.player_count,
    'is_free', v_room.entry_amount = 0
  );
END;
$$;

-- Step 5: Create function to check room info (for join confirmation)
CREATE OR REPLACE FUNCTION public.check_ludo_room_multiplayer(p_room_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room RECORD;
  v_host RECORD;
  v_current_players INTEGER;
  v_players JSON;
BEGIN
  -- Find room
  SELECT * INTO v_room 
  FROM ludo_rooms 
  WHERE room_code = UPPER(p_room_code) 
    AND status IN ('waiting', 'ready');
  
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or game already started');
  END IF;
  
  -- Get host info
  SELECT username, avatar_url INTO v_host FROM profiles WHERE id = v_room.host_id;
  
  -- Count current players
  SELECT COUNT(*) INTO v_current_players FROM ludo_room_players WHERE room_id = v_room.id;
  
  -- Get all players in room
  SELECT json_agg(json_build_object(
    'user_id', rp.user_id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'player_color', rp.player_color,
    'slot_index', rp.slot_index
  ) ORDER BY rp.slot_index)
  INTO v_players
  FROM ludo_room_players rp
  JOIN profiles p ON p.id = rp.user_id
  WHERE rp.room_id = v_room.id;
  
  RETURN json_build_object(
    'success', true,
    'room_code', v_room.room_code,
    'entry_amount', v_room.entry_amount,
    'reward_amount', v_room.reward_amount,
    'player_count', v_room.player_count,
    'current_players', v_current_players,
    'is_free', v_room.entry_amount = 0,
    'host_name', v_host.username,
    'host_avatar', v_host.avatar_url,
    'players', COALESCE(v_players, '[]'::JSON),
    'is_full', v_current_players >= v_room.player_count
  );
END;
$$;

-- Step 6: Create function to cancel multi-player room (with refunds for all players)
CREATE OR REPLACE FUNCTION public.cancel_ludo_room_multiplayer(p_room_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_room RECORD;
  v_player RECORD;
  v_refund_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  -- Get room (only host can cancel, and only if waiting/ready)
  SELECT * INTO v_room 
  FROM ludo_rooms 
  WHERE id = p_room_id 
    AND host_id = v_user_id 
    AND status IN ('waiting', 'ready');
  
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or cannot be cancelled');
  END IF;
  
  -- Refund all players
  FOR v_player IN 
    SELECT user_id FROM ludo_room_players WHERE room_id = p_room_id
  LOOP
    IF v_room.entry_amount > 0 THEN
      UPDATE profiles SET wallet_balance = wallet_balance + v_room.entry_amount WHERE id = v_player.user_id;
      
      INSERT INTO transactions (user_id, type, amount, status, description)
      VALUES (v_player.user_id, 'refund', v_room.entry_amount, 'completed', 'Ludo Room Cancelled: ' || v_room.room_code);
    END IF;
    v_refund_count := v_refund_count + 1;
  END LOOP;
  
  -- Delete players from room
  DELETE FROM ludo_room_players WHERE room_id = p_room_id;
  
  -- Update room status
  UPDATE ludo_rooms SET status = 'cancelled', ended_at = now(), updated_at = now() WHERE id = p_room_id;
  
  RETURN json_build_object('success', true, 'message', 'Room cancelled', 'refunded_players', v_refund_count);
END;
$$;

-- Step 7: Create function to leave a room (for non-host players)
CREATE OR REPLACE FUNCTION public.leave_ludo_room(p_room_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_room RECORD;
  v_player RECORD;
BEGIN
  v_user_id := auth.uid();
  
  -- Get room
  SELECT * INTO v_room 
  FROM ludo_rooms 
  WHERE id = p_room_id 
    AND status IN ('waiting', 'ready');
  
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or game already started');
  END IF;
  
  -- Check if user is in room
  SELECT * INTO v_player FROM ludo_room_players WHERE room_id = p_room_id AND user_id = v_user_id;
  
  IF v_player IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'You are not in this room');
  END IF;
  
  -- Host cannot leave - must cancel instead
  IF v_room.host_id = v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Host cannot leave. Use cancel instead.');
  END IF;
  
  -- Refund entry if paid
  IF v_room.entry_amount > 0 THEN
    UPDATE profiles SET wallet_balance = wallet_balance + v_room.entry_amount WHERE id = v_user_id;
    
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'refund', v_room.entry_amount, 'completed', 'Left Ludo Room: ' || v_room.room_code);
  END IF;
  
  -- Remove player from room
  DELETE FROM ludo_room_players WHERE room_id = p_room_id AND user_id = v_user_id;
  
  -- Set room back to waiting if was ready
  IF v_room.status = 'ready' THEN
    UPDATE ludo_rooms SET status = 'waiting', guest_id = NULL, guest_color = NULL, updated_at = now() WHERE id = p_room_id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Left room successfully');
END;
$$;