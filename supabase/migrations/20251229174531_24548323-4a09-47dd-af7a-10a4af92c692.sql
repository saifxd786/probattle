-- Drop the SECURITY DEFINER view (causes security issues)
DROP VIEW IF EXISTS public.matches_public;

-- The approach will be simpler:
-- 1. Keep the "Anyone can view matches without credentials" policy
-- 2. The application code will use a secure RPC function to get room credentials
-- 3. This RPC function will check if user is registered before returning credentials

-- Create a secure RPC function to get room credentials for registered users
CREATE OR REPLACE FUNCTION public.get_match_room_credentials(_match_id uuid)
RETURNS TABLE(room_id text, room_password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY 
    SELECT m.room_id, m.room_password 
    FROM public.matches m 
    WHERE m.id = _match_id;
    RETURN;
  END IF;
  
  -- Check if user is registered and approved for this match
  IF EXISTS (
    SELECT 1 FROM public.match_registrations
    WHERE match_id = _match_id
    AND user_id = auth.uid()
    AND is_approved = true
  ) THEN
    RETURN QUERY 
    SELECT m.room_id, m.room_password 
    FROM public.matches m 
    WHERE m.id = _match_id;
    RETURN;
  END IF;
  
  -- Return NULL if not authorized
  RETURN QUERY SELECT NULL::text, NULL::text;
END;
$$;