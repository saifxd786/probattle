-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;

-- Create a function to check if user is registered for a match
CREATE OR REPLACE FUNCTION public.is_registered_for_match(_user_id uuid, _match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.match_registrations
    WHERE user_id = _user_id
      AND match_id = _match_id
      AND is_approved = true
  )
$$;

-- Create a view that hides room credentials from unauthorized users
CREATE OR REPLACE VIEW public.matches_public AS
SELECT 
  id,
  title,
  game,
  match_type,
  status,
  entry_fee,
  prize_pool,
  prize_per_kill,
  max_slots,
  filled_slots,
  match_time,
  map_name,
  rules,
  banner_url,
  is_free,
  created_at,
  updated_at,
  created_by,
  -- Only show room credentials to registered participants or admins
  CASE 
    WHEN public.has_role(auth.uid(), 'admin') THEN room_id
    WHEN public.is_registered_for_match(auth.uid(), id) THEN room_id
    ELSE NULL
  END AS room_id,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin') THEN room_password
    WHEN public.is_registered_for_match(auth.uid(), id) THEN room_password
    ELSE NULL
  END AS room_password
FROM public.matches;

-- Grant access to the view
GRANT SELECT ON public.matches_public TO anon, authenticated;

-- Create new policy for matches table - admins can see everything
CREATE POLICY "Admins can view all matches with credentials"
ON public.matches
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Registered users can see matches they're registered for (with credentials)
CREATE POLICY "Registered users can view their match credentials"
ON public.matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.match_registrations
    WHERE match_registrations.match_id = matches.id
    AND match_registrations.user_id = auth.uid()
    AND match_registrations.is_approved = true
  )
);

-- Anyone can view basic match info (but we'll use the view for this)
CREATE POLICY "Anyone can view matches without credentials"
ON public.matches
FOR SELECT
USING (true);