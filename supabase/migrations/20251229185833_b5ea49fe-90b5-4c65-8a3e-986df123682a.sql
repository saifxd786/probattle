-- Add first_place_prize column for Classic matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS first_place_prize numeric DEFAULT 0.00;

-- Create function to handle auto refund when match is cancelled or deleted
CREATE OR REPLACE FUNCTION public.handle_match_refund()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  registration RECORD;
  match_entry_fee numeric;
  match_title text;
BEGIN
  -- Get match details
  match_entry_fee := OLD.entry_fee;
  match_title := OLD.title;
  
  -- Skip if match is free
  IF OLD.is_free = true OR match_entry_fee = 0 THEN
    RETURN OLD;
  END IF;

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
      
      -- Create refund transaction
      INSERT INTO transactions (user_id, amount, type, status, description)
      VALUES (
        registration.user_id, 
        match_entry_fee, 
        'refund', 
        'completed', 
        CASE 
          WHEN TG_OP = 'DELETE' THEN 'Refund for deleted match: ' || match_title
          ELSE 'Refund for cancelled match: ' || match_title
        END
      );
      
      -- Send notification
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        registration.user_id,
        '💰 Refund Processed',
        'Your entry fee of ₹' || match_entry_fee || ' for "' || match_title || '" has been refunded to your wallet.',
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

-- Create trigger for match refund on status change
DROP TRIGGER IF EXISTS trg_match_refund_on_cancel ON matches;
CREATE TRIGGER trg_match_refund_on_cancel
  BEFORE UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION handle_match_refund();

-- Create trigger for match refund on delete
DROP TRIGGER IF EXISTS trg_match_refund_on_delete ON matches;
CREATE TRIGGER trg_match_refund_on_delete
  BEFORE DELETE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION handle_match_refund();