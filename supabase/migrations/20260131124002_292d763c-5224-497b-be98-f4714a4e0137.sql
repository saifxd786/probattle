-- Add active session tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_session_id TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_active_session ON public.profiles(active_session_id);

-- Function to invalidate other sessions when user logs in
CREATE OR REPLACE FUNCTION public.set_active_session(
  _user_id UUID,
  _session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    active_session_id = _session_id,
    last_login_at = NOW()
  WHERE id = _user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to check if session is still valid
CREATE OR REPLACE FUNCTION public.is_session_valid(
  _user_id UUID,
  _session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND active_session_id = _session_id
  );
$$;