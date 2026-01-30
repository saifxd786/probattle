-- SECURITY FIX: Remove public SELECT on redeem_codes to prevent cheating
DROP POLICY IF EXISTS "Anyone can view active codes for validation" ON public.redeem_codes;

-- SECURITY FIX: Restrict app_settings to hide payment UPI from non-admins
-- Create a secure view that hides sensitive payment info
CREATE OR REPLACE VIEW public.app_settings_public 
WITH (security_invoker=on) AS
  SELECT 
    id, 
    key, 
    CASE 
      WHEN key = 'payment_upi' THEN '{"upi_id": "***hidden***"}'::jsonb
      ELSE value 
    END as value,
    created_at, 
    updated_at
  FROM public.app_settings
  WHERE key != 'payment_upi' OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin');

-- Update the RLS policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- Only admins can read app_settings directly (for payment_upi)
CREATE POLICY "Admins can read all app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (
    key != 'payment_upi' OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- SECURITY FIX: Make mines_games more restrictive - hide mine_positions
-- Users should NOT be able to SELECT mine_positions during active games
DROP POLICY IF EXISTS "Users can view their own mines games" ON public.mines_games;

CREATE POLICY "Users can view their own completed mines games"
  ON public.mines_games FOR SELECT
  USING (
    (auth.uid() = user_id AND status IN ('won', 'lost')) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- SECURITY FIX: Make thimble_games more restrictive - hide ball_position
DROP POLICY IF EXISTS "Users can view their own thimble games" ON public.thimble_games;

CREATE POLICY "Users can view their own completed thimble games"
  ON public.thimble_games FOR SELECT
  USING (
    (auth.uid() = user_id AND status = 'completed') OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- SECURITY FIX: Remove user INSERT/UPDATE on games - only server can manage
DROP POLICY IF EXISTS "Users can create their own mines games" ON public.mines_games;
DROP POLICY IF EXISTS "Users can update their own mines games" ON public.mines_games;
DROP POLICY IF EXISTS "Users can create their own thimble games" ON public.thimble_games;
DROP POLICY IF EXISTS "Users can update their own thimble games" ON public.thimble_games;

-- Only service role (edge functions) can manage active games