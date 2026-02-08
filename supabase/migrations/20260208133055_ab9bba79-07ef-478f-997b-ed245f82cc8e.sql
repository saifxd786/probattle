-- Update the auto_cancel_unfilled_match function to include game type in refund description
CREATE OR REPLACE FUNCTION public.auto_cancel_unfilled_match(p_match_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_registration RECORD;
  v_refund_count INTEGER := 0;
  v_game_label TEXT;
BEGIN
  -- Get match details
  SELECT * INTO v_match 
  FROM matches 
  WHERE id = p_match_id 
    AND status = 'upcoming'
    AND is_auto_scheduled = true;
  
  IF v_match IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Match not found or not eligible');
  END IF;
  
  -- Check if match is full (2 slots for 1v1)
  IF v_match.filled_slots >= v_match.max_slots THEN
    RETURN json_build_object('success', false, 'message', 'Match is full');
  END IF;
  
  -- Determine game label
  v_game_label := CASE 
    WHEN v_match.game = 'bgmi' THEN 'BGMI'
    WHEN v_match.game = 'freefire' THEN 'Free Fire'
    ELSE UPPER(v_match.game::text)
  END;
  
  -- Process refunds for all registered users
  FOR v_registration IN 
    SELECT mr.*, p.wallet_balance 
    FROM match_registrations mr
    JOIN profiles p ON p.id = mr.user_id
    WHERE mr.match_id = p_match_id 
      AND mr.is_approved = true
  LOOP
    -- Refund the user
    UPDATE profiles 
    SET wallet_balance = wallet_balance + v_match.entry_fee
    WHERE id = v_registration.user_id;
    
    -- Create refund transaction with game details
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (
      v_registration.user_id, 
      'refund', 
      v_match.entry_fee, 
      'completed', 
      v_game_label || ' ' || v_match.match_type::text || ' - ' || v_match.title || ' (cancelled: insufficient players)'
    );
    
    -- Create notification for user
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_registration.user_id,
      '🔄 Match Cancelled - Refund Processed',
      v_game_label || ' "' || v_match.title || '" was cancelled due to insufficient players. ₹' || v_match.entry_fee || ' has been refunded to your wallet.',
      'info'
    );
    
    v_refund_count := v_refund_count + 1;
  END LOOP;
  
  -- Cancel the match
  UPDATE matches 
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_match_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Match cancelled and ' || v_refund_count || ' user(s) refunded'
  );
END;
$$;