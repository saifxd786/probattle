-- Create redeem codes table
CREATE TABLE public.redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create redeem code usage tracking
CREATE TABLE public.redeem_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
  amount numeric NOT NULL,
  UNIQUE(code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeem_code_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for redeem_codes
CREATE POLICY "Admins can manage redeem codes"
ON public.redeem_codes FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active codes for validation"
ON public.redeem_codes FOR SELECT
USING (is_active = true);

-- RLS Policies for redeem_code_uses
CREATE POLICY "Admins can view all uses"
ON public.redeem_code_uses FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own redemptions"
ON public.redeem_code_uses FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can redeem codes"
ON public.redeem_code_uses FOR INSERT
WITH CHECK (user_id = auth.uid());