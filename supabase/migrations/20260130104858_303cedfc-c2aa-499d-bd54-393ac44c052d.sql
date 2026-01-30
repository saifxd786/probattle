-- Create TDM match schedule settings table
CREATE TABLE public.tdm_schedule_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  schedule_times TEXT[] NOT NULL DEFAULT ARRAY['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00'],
  match_type TEXT NOT NULL DEFAULT 'tdm_1v1',
  entry_fee NUMERIC NOT NULL DEFAULT 10,
  prize_pool NUMERIC NOT NULL DEFAULT 18,
  max_slots INTEGER NOT NULL DEFAULT 2,
  gun_category TEXT DEFAULT 'any_gun',
  auto_cancel_seconds INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tdm_schedule_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage TDM schedule settings"
ON public.tdm_schedule_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read settings
CREATE POLICY "Anyone can read TDM schedule settings"
ON public.tdm_schedule_settings
FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.tdm_schedule_settings (
  schedule_times, 
  match_type, 
  entry_fee, 
  prize_pool, 
  max_slots, 
  gun_category
) VALUES (
  ARRAY['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00'],
  'tdm_1v1',
  10,
  18,
  2,
  'any_gun'
);

-- Add is_auto_scheduled column to matches table for tracking auto-created matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_auto_scheduled BOOLEAN DEFAULT false;

-- Add auto_cancel_at column to track when to auto-cancel
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS auto_cancel_at TIMESTAMP WITH TIME ZONE;

-- Create function to auto-cancel matches and refund users
CREATE OR REPLACE FUNCTION public.auto_cancel_unfilled_match(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match RECORD;
  v_registration RECORD;
  v_refund_count INTEGER := 0;
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
    
    -- Create refund transaction
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (
      v_registration.user_id, 
      'refund', 
      v_match.entry_fee, 
      'completed', 
      'Auto-refund: Match cancelled due to insufficient players'
    );
    
    -- Create notification for user
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_registration.user_id,
      '🔄 Match Cancelled - Refund Processed',
      'Match "' || v_match.title || '" was cancelled due to insufficient players. ₹' || v_match.entry_fee || ' has been refunded to your wallet.',
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

-- Create function to check and notify when match is full
CREATE OR REPLACE FUNCTION public.notify_match_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  -- Only check if filled_slots was updated and match is now full
  IF NEW.filled_slots >= NEW.max_slots AND OLD.filled_slots < NEW.max_slots THEN
    -- Get all admin users
    FOR v_admin IN 
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      -- Create notification for admin
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES (
        v_admin.user_id,
        '🎮 TDM Match Full!',
        'Match "' || NEW.title || '" is now full with ' || NEW.max_slots || ' players. Room details need to be published.',
        'success',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for match full notifications
DROP TRIGGER IF EXISTS on_match_full ON matches;
CREATE TRIGGER on_match_full
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_full();

-- Create view for today's scheduled matches
CREATE OR REPLACE VIEW public.todays_scheduled_matches AS
SELECT 
  m.*,
  CASE 
    WHEN m.filled_slots >= m.max_slots THEN 'full'
    WHEN m.filled_slots > 0 THEN 'partially_filled'
    ELSE 'empty'
  END as fill_status
FROM matches m
WHERE m.is_auto_scheduled = true
  AND DATE(m.match_time AT TIME ZONE 'Asia/Kolkata') = DATE(now() AT TIME ZONE 'Asia/Kolkata')
ORDER BY m.match_time ASC;