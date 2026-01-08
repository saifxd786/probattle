-- Add security question and DOB columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS security_question TEXT,
ADD COLUMN IF NOT EXISTS security_answer TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.date_of_birth IS 'User date of birth for account recovery';
COMMENT ON COLUMN public.profiles.security_question IS 'Security question for password recovery';
COMMENT ON COLUMN public.profiles.security_answer IS 'Hashed answer to security question';