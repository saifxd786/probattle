-- Allow authenticated users to create and update their own mines games (client-based gameplay)

-- Ensure RLS is enabled (it already is, but this is safe)
ALTER TABLE public.mines_games ENABLE ROW LEVEL SECURITY;

-- INSERT policy
DROP POLICY IF EXISTS "Users can insert their own mines games" ON public.mines_games;
CREATE POLICY "Users can insert their own mines games"
ON public.mines_games
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update their own mines games" ON public.mines_games;
CREATE POLICY "Users can update their own mines games"
ON public.mines_games
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);