-- Ludo match players table
CREATE TABLE public.ludo_match_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.ludo_matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  is_bot boolean NOT NULL DEFAULT false,
  bot_name text,
  bot_avatar_url text,
  player_color text NOT NULL,
  token_positions jsonb NOT NULL DEFAULT '[0, 0, 0, 0]',
  tokens_home integer NOT NULL DEFAULT 0,
  is_winner boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_color)
);

-- Enable RLS on ludo_match_players
ALTER TABLE public.ludo_match_players ENABLE ROW LEVEL SECURITY;

-- Users can view players in matches they're part of
CREATE POLICY "Users can view ludo match players"
ON public.ludo_match_players
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ludo_match_players p2
    WHERE p2.match_id = ludo_match_players.match_id AND p2.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can join matches (as themselves or add bots)
CREATE POLICY "Users can join ludo matches"
ON public.ludo_match_players
FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND is_bot = false)
  OR is_bot = true
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Players can update their tokens or bot tokens
CREATE POLICY "Players can update ludo state"
ON public.ludo_match_players
FOR UPDATE
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (is_bot = true AND EXISTS (
    SELECT 1 FROM public.ludo_match_players
    WHERE match_id = ludo_match_players.match_id AND user_id = auth.uid()
  ))
);

-- Add SELECT policy for users viewing their matches
CREATE POLICY "Users can view their ludo matches"
ON public.ludo_matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ludo_match_players
    WHERE match_id = ludo_matches.id AND user_id = auth.uid()
  )
);

-- Players can update match state
CREATE POLICY "Players can update ludo match state"
ON public.ludo_matches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ludo_match_players
    WHERE match_id = ludo_matches.id AND user_id = auth.uid()
  )
);

-- Enable realtime for players
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_match_players;

-- Ludo transaction history
CREATE TABLE public.ludo_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  match_id uuid REFERENCES public.ludo_matches(id),
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('entry', 'win', 'refund')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on ludo_transactions
ALTER TABLE public.ludo_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their transactions
CREATE POLICY "Users can view their ludo transactions"
ON public.ludo_transactions
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create ludo transactions"
ON public.ludo_transactions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage ludo transactions"
ON public.ludo_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));