-- Update the function to generate exactly 5 random digits
CREATE OR REPLACE FUNCTION public.generate_5digit_user_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate exactly 5 random digits (10000-99999)
    new_code := LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0');
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE user_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update existing users to have 5-digit codes and sync referral_code
UPDATE profiles 
SET 
  user_code = LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0'),
  referral_code = LPAD(FLOOR(RANDOM() * 90000 + 10000)::text, 5, '0')
WHERE user_code IS NULL OR LENGTH(user_code) != 5;

-- Make sure referral_code matches user_code for all users
UPDATE profiles 
SET referral_code = user_code
WHERE referral_code IS DISTINCT FROM user_code;

-- Create trigger to auto-set referral_code = user_code on insert/update
CREATE OR REPLACE FUNCTION public.sync_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If user_code is set, make referral_code match it
  IF NEW.user_code IS NOT NULL THEN
    NEW.referral_code := NEW.user_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_referral_code_trigger ON profiles;
CREATE TRIGGER sync_referral_code_trigger
  BEFORE INSERT OR UPDATE OF user_code ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_referral_code();