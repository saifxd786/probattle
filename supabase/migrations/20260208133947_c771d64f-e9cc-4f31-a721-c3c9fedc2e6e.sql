
-- Fix the handle_match_refund trigger to skip auto-scheduled matches (handled by RPC)
CREATE OR REPLACE FUNCTION public.handle_match_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  registration RECORD;
  match_entry_fee numeric;
  match_title text;
  v_game_label TEXT;
BEGIN
  -- Get match details
  match_entry_fee := OLD.entry_fee;
  match_title := OLD.title;
  
  -- Skip if match is free
  IF OLD.is_free = true OR match_entry_fee = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- IMPORTANT: Skip auto-scheduled matches - they are handled by the auto_cancel_unfilled_match RPC
  -- This prevents double refunds
  IF OLD.is_auto_scheduled = true AND TG_OP = 'UPDATE' AND NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Determine game label
  v_game_label := CASE 
    WHEN OLD.game = 'bgmi' THEN 'BGMI'
    WHEN OLD.game = 'freefire' THEN 'Free Fire'
    ELSE UPPER(OLD.game::text)
  END;

  -- For DELETE or cancelled status - refund all approved registrations
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
    FOR registration IN 
      SELECT user_id FROM match_registrations 
      WHERE match_id = OLD.id AND is_approved = true
    LOOP
      -- Refund to wallet
      UPDATE profiles 
      SET wallet_balance = wallet_balance + match_entry_fee 
      WHERE id = registration.user_id;
      
      -- Create refund transaction with game details
      INSERT INTO transactions (user_id, amount, type, status, description)
      VALUES (
        registration.user_id, 
        match_entry_fee, 
        'refund', 
        'completed', 
        CASE 
          WHEN TG_OP = 'DELETE' THEN v_game_label || ' ' || OLD.match_type::text || ' - ' || match_title || ' (match deleted)'
          ELSE v_game_label || ' ' || OLD.match_type::text || ' - ' || match_title || ' (cancelled)'
        END
      );
      
      -- Send notification
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        registration.user_id,
        '💰 Refund Processed',
        v_game_label || ' "' || match_title || '" - ₹' || match_entry_fee || ' has been refunded to your wallet.',
        'success'
      );
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;
