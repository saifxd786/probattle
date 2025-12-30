-- Fix Ludo match creation: remove RLS recursion + make newly inserted match selectable

-- 1) Add match creator for immediate SELECT after INSERT
ALTER TABLE public.ludo_matches
ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL;

-- Link to profiles (public) instead of auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ludo_matches_created_by_fkey'
  ) THEN
    ALTER TABLE public.ludo_matches
    ADD CONSTRAINT ludo_matches_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ludo_matches_created_by ON public.ludo_matches(created_by);

-- 2) Security definer helper to avoid infinite recursion in policies
CREATE OR REPLACE FUNCTION public.ludo_is_user_in_match(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ludo_match_players p
    WHERE p.match_id = _match_id
      AND p.user_id = _user_id
      AND p.is_bot = false
  );
$$;

-- 3) Replace problematic policies
-- ludo_match_players
DROP POLICY IF EXISTS "Users can view ludo match players" ON public.ludo_match_players;
DROP POLICY IF EXISTS "Players can update ludo state" ON public.ludo_match_players;
DROP POLICY IF EXISTS "Users can join ludo matches" ON public.ludo_match_players;

CREATE POLICY "Users can view ludo match players"
ON public.ludo_match_players
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.ludo_is_user_in_match(match_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can join ludo matches"
ON public.ludo_match_players
FOR INSERT
WITH CHECK (
  ((user_id = auth.uid()) AND (is_bot = false))
  OR (is_bot = true AND public.ludo_is_user_in_match(match_id, auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Players can update ludo state"
ON public.ludo_match_players
FOR UPDATE
USING (
  (user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (is_bot = true AND public.ludo_is_user_in_match(match_id, auth.uid()))
);

-- ludo_matches
DROP POLICY IF EXISTS "Users can view their ludo matches" ON public.ludo_matches;
DROP POLICY IF EXISTS "Players can update ludo match state" ON public.ludo_matches;
DROP POLICY IF EXISTS "Users can create ludo matches" ON public.ludo_matches;

CREATE POLICY "Users can create ludo matches"
ON public.ludo_matches
FOR INSERT
WITH CHECK (
  (created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view their ludo matches"
ON public.ludo_matches
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.ludo_is_user_in_match(id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Players can update ludo match state"
ON public.ludo_matches
FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.ludo_is_user_in_match(id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
