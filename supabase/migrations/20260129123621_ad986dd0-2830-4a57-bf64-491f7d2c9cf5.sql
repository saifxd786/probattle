-- Fix the overly permissive RLS policy for user_upi_accounts
DROP POLICY IF EXISTS "System can manage UPI accounts" ON public.user_upi_accounts;

-- Create more restrictive policies
CREATE POLICY "Users can view their own UPI accounts"
  ON public.user_upi_accounts
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own UPI accounts"
  ON public.user_upi_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own UPI accounts"
  ON public.user_upi_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);