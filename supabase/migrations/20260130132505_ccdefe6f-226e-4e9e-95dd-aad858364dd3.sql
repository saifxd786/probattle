
-- Create a function to check room info without joining
CREATE OR REPLACE FUNCTION check_ludo_room(p_room_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_room RECORD;
  v_host_profile RECORD;
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
  
  -- Get host info for display
  SELECT username, user_code, avatar_url INTO v_host_profile 
  FROM profiles WHERE id = v_room.host_id;
  
  RETURN json_build_object(
    'success', true,
    'room_code', v_room.room_code,
    'entry_amount', v_room.entry_amount,
    'reward_amount', v_room.reward_amount,
    'is_free', v_room.entry_amount = 0,
    'host_name', COALESCE(v_host_profile.username, 'Player ' || COALESCE(v_host_profile.user_code, 'Unknown')),
    'host_avatar', v_host_profile.avatar_url
  );
END;
$$;
