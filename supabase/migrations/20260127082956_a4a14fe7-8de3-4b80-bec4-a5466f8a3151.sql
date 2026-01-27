-- Create ludo_rooms table for friend multiplayer
CREATE TABLE public.ludo_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  guest_id UUID REFERENCES auth.users(id),
  entry_amount INTEGER NOT NULL DEFAULT 100,
  reward_amount INTEGER NOT NULL DEFAULT 150,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'playing', 'completed', 'cancelled')),
  host_color VARCHAR(10) DEFAULT 'red',
  guest_color VARCHAR(10) DEFAULT 'blue',
  current_turn INTEGER DEFAULT 0,
  game_state JSONB,
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ludo_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view rooms they are part of"
ON public.ludo_rooms
FOR SELECT
USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Users can create rooms"
ON public.ludo_rooms
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update rooms they are part of"
ON public.ludo_rooms
FOR UPDATE
USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Create function to generate unique 6-digit room code
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.ludo_rooms WHERE room_code = new_code AND status IN ('waiting', 'ready', 'playing')) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Create function to create a room
CREATE OR REPLACE FUNCTION public.create_ludo_room(p_entry_amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance NUMERIC;
  v_room_code TEXT;
  v_room_id UUID;
  v_reward_amount INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Check wallet balance
  SELECT wallet_balance INTO v_wallet_balance FROM profiles WHERE id = v_user_id;
  
  IF COALESCE(v_wallet_balance, 0) < p_entry_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;
  
  -- Generate room code
  v_room_code := generate_room_code();
  
  -- Calculate reward (1.5x of total pool)
  v_reward_amount := (p_entry_amount * 2 * 1.5)::INTEGER;
  
  -- Deduct entry amount
  UPDATE profiles SET wallet_balance = wallet_balance - p_entry_amount WHERE id = v_user_id;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (v_user_id, 'entry_fee', p_entry_amount, 'completed', 'Ludo Room Entry: ' || v_room_code);
  
  -- Create room
  INSERT INTO ludo_rooms (room_code, host_id, entry_amount, reward_amount)
  VALUES (v_room_code, v_user_id, p_entry_amount, v_reward_amount)
  RETURNING id INTO v_room_id;
  
  RETURN json_build_object(
    'success', true,
    'room_id', v_room_id,
    'room_code', v_room_code,
    'entry_amount', p_entry_amount,
    'reward_amount', v_reward_amount
  );
END;
$$;

-- Create function to join a room
CREATE OR REPLACE FUNCTION public.join_ludo_room(p_room_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance NUMERIC;
  v_room RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Find room
  SELECT * INTO v_room FROM ludo_rooms WHERE room_code = UPPER(p_room_code) AND status = 'waiting';
  
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or already started');
  END IF;
  
  -- Can't join own room
  IF v_room.host_id = v_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot join your own room');
  END IF;
  
  -- Check wallet balance
  SELECT wallet_balance INTO v_wallet_balance FROM profiles WHERE id = v_user_id;
  
  IF COALESCE(v_wallet_balance, 0) < v_room.entry_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance. Need ₹' || v_room.entry_amount);
  END IF;
  
  -- Deduct entry amount
  UPDATE profiles SET wallet_balance = wallet_balance - v_room.entry_amount WHERE id = v_user_id;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (v_user_id, 'entry_fee', v_room.entry_amount, 'completed', 'Ludo Room Join: ' || v_room.room_code);
  
  -- Update room with guest
  UPDATE ludo_rooms 
  SET guest_id = v_user_id, status = 'ready', updated_at = now()
  WHERE id = v_room.id;
  
  RETURN json_build_object(
    'success', true,
    'room_id', v_room.id,
    'room_code', v_room.room_code,
    'entry_amount', v_room.entry_amount,
    'reward_amount', v_room.reward_amount,
    'host_id', v_room.host_id
  );
END;
$$;

-- Create function to cancel room (only host, only in waiting status)
CREATE OR REPLACE FUNCTION public.cancel_ludo_room(p_room_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_room RECORD;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_room FROM ludo_rooms WHERE id = p_room_id AND host_id = v_user_id AND status = 'waiting';
  
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or cannot be cancelled');
  END IF;
  
  -- Refund entry amount
  UPDATE profiles SET wallet_balance = wallet_balance + v_room.entry_amount WHERE id = v_user_id;
  
  -- Create refund transaction
  INSERT INTO transactions (user_id, type, amount, status, description)
  VALUES (v_user_id, 'refund', v_room.entry_amount, 'completed', 'Ludo Room Cancelled: ' || v_room.room_code);
  
  -- Update room status
  UPDATE ludo_rooms SET status = 'cancelled', ended_at = now(), updated_at = now() WHERE id = p_room_id;
  
  RETURN json_build_object('success', true, 'message', 'Room cancelled and amount refunded');
END;
$$;

-- Enable realtime for ludo_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_rooms;