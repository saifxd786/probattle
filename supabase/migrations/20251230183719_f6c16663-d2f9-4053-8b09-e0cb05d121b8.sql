-- Ludo matches table
CREATE TABLE public.ludo_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_amount numeric NOT NULL DEFAULT 100,
  reward_amount numeric NOT NULL DEFAULT 150,
  player_count integer NOT NULL DEFAULT 2 CHECK (player_count IN (2, 4)),
  status ludo_match_status NOT NULL DEFAULT 'waiting',
  difficulty ludo_difficulty NOT NULL DEFAULT 'normal',
  winner_id uuid REFERENCES auth.users(id),
  game_state jsonb DEFAULT '{}',
  current_turn integer DEFAULT 0,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on ludo_matches
ALTER TABLE public.ludo_matches ENABLE ROW LEVEL SECURITY;

-- Admins can view all matches
CREATE POLICY "Admins can view all ludo matches"
ON public.ludo_matches
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create matches
CREATE POLICY "Users can create ludo matches"
ON public.ludo_matches
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update matches
CREATE POLICY "Admins can update ludo matches"
ON public.ludo_matches
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete matches
CREATE POLICY "Admins can delete ludo matches"
ON public.ludo_matches
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_ludo_matches_updated_at
BEFORE UPDATE ON public.ludo_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ludo_settings_updated_at
BEFORE UPDATE ON public.ludo_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for game state
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_matches;