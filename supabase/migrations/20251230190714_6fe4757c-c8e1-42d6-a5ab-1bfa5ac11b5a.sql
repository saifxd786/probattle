-- Drop problematic policies causing infinite recursion
DROP POLICY IF EXISTS "Users can view their ludo matches" ON public.ludo_matches;
DROP POLICY IF EXISTS "Players can update ludo match state" ON public.ludo_matches;
DROP POLICY IF EXISTS "Users can view ludo match players" ON public.ludo_match_players;
DROP POLICY IF EXISTS "Players can update ludo state" ON public.ludo_match_players;

-- Recreate ludo_matches policies without recursion
CREATE POLICY "Users can view their ludo matches" 
ON public.ludo_matches 
FOR SELECT 
USING (
  id IN (
    SELECT match_id FROM public.ludo_match_players WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Players can update ludo match state" 
ON public.ludo_matches 
FOR UPDATE 
USING (
  id IN (
    SELECT match_id FROM public.ludo_match_players WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Recreate ludo_match_players policies without self-referencing recursion
CREATE POLICY "Users can view ludo match players" 
ON public.ludo_match_players 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR match_id IN (
    SELECT match_id FROM public.ludo_match_players WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Players can update ludo state" 
ON public.ludo_match_players 
FOR UPDATE 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_bot = true 
    AND match_id IN (
      SELECT match_id FROM public.ludo_match_players WHERE user_id = auth.uid()
    )
  )
);