-- Update create_ludo_room to reduce wager requirement when entry fee is paid
CREATE OR REPLACE FUNCTION public.create_ludo_room(p_entry_amount INTEGER)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance NUMERIC;
  v_wager_requirement NUMERIC;
  v_room_code TEXT;
  v_room_id UUID;
  v_reward_amount INTEGER;
  v_new_wager NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
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
  
  -- Calculate reward (1.5x of total pool, 0 for free matches)
  IF p_entry_amount > 0 THEN
    v_reward_amount := (p_entry_amount * 2 * 1.5)::INTEGER;
  ELSE
    v_reward_amount := 0;
  END IF;
  
  -- Only deduct entry amount and reduce wager if not a free match
  IF p_entry_amount > 0 THEN
    -- Calculate new wager requirement (reduce by entry amount, minimum 0)
    v_new_wager := GREATEST(0, COALESCE(v_wager_requirement, 0) - p_entry_amount);
    
    UPDATE profiles 
    SET wallet_balance = wallet_balance - p_entry_amount,
        wager_requirement = v_new_wager
    WHERE id = v_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'entry_fee', p_entry_amount, 'completed', 'Ludo Room Entry: ' || v_room_code);
  END IF;
  
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

-- Update join_ludo_room to reduce wager requirement when entry fee is paid
CREATE OR REPLACE FUNCTION public.join_ludo_room(p_room_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance NUMERIC;
  v_wager_requirement NUMERIC;
  v_room RECORD;
  v_new_wager NUMERIC;
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
  
  -- Only check wallet balance if not a free match
  IF v_room.entry_amount > 0 THEN
    SELECT wallet_balance, COALESCE(wager_requirement, 0) INTO v_wallet_balance, v_wager_requirement 
    FROM profiles WHERE id = v_user_id;
    
    IF COALESCE(v_wallet_balance, 0) < v_room.entry_amount THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient balance. Need ₹' || v_room.entry_amount);
    END IF;
    
    -- Calculate new wager requirement (reduce by entry amount, minimum 0)
    v_new_wager := GREATEST(0, COALESCE(v_wager_requirement, 0) - v_room.entry_amount);
    
    -- Deduct entry amount and reduce wager
    UPDATE profiles 
    SET wallet_balance = wallet_balance - v_room.entry_amount,
        wager_requirement = v_new_wager
    WHERE id = v_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (v_user_id, 'entry_fee', v_room.entry_amount, 'completed', 'Ludo Room Join: ' || v_room.room_code);
  END IF;
  
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
    'host_id', v_room.host_id,
    'is_free', v_room.entry_amount = 0
  );
END;
$$;