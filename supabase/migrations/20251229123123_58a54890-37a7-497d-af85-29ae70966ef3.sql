-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  reward_amount NUMERIC NOT NULL DEFAULT 10.00,
  is_rewarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view referrals they made"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- Users can view referrals where they were referred
CREATE POLICY "Users can view their referral"
ON public.referrals
FOR SELECT
USING (auth.uid() = referred_id);

-- System can create referrals
CREATE POLICY "Users can create referrals on signup"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.referrals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add referral_code column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referred_by column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID;

-- Create function to generate referral codes for existing users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := 'REF' || UPPER(SUBSTRING(md5(random()::text), 1, 6));
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for referral code generation
CREATE TRIGGER generate_referral_code_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- Create index for faster lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);