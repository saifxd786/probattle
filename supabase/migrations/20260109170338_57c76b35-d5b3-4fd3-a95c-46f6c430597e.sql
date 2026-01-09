-- Update the generate_user_code function to create 5-digit random numeric codes
CREATE OR REPLACE FUNCTION public.generate_5digit_user_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 5-digit code (10000-99999)
    new_code := LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update the handle_new_user function to use the new 5-digit code generator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  new_referral_code TEXT;
BEGIN
  -- Generate 5-digit user code
  new_code := public.generate_5digit_user_code();
  
  -- Generate referral code (keep 8 chars for referrals)
  new_referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
  
  INSERT INTO public.profiles (id, username, email, phone, user_code, referral_code, wallet_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', SPLIT_PART(NEW.email, '@', 1)),
    new_code,
    new_referral_code,
    0
  );
  RETURN NEW;
END;
$$;