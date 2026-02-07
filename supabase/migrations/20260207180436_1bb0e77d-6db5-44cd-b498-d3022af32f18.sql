-- Create table for public ludo challenges (users create and wait for others to join)
CREATE TABLE IF NOT EXISTS public.ludo_public_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_amount INTEGER NOT NULL DEFAULT 10,
  player_mode INTEGER NOT NULL DEFAULT 2 CHECK (player_mode IN (2, 3, 4)),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired', 'cancelled')),
  room_code TEXT,
  matched_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ludo_public_challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view waiting challenges
CREATE POLICY "Anyone can view waiting challenges"
ON public.ludo_public_challenges
FOR SELECT
USING (status = 'waiting' OR creator_id = auth.uid() OR matched_user_id = auth.uid());

-- Policy: Authenticated users can create challenges
CREATE POLICY "Users can create their own challenges"
ON public.ludo_public_challenges
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Policy: Users can update their own challenges or join others
CREATE POLICY "Users can update challenges"
ON public.ludo_public_challenges
FOR UPDATE
USING (auth.uid() = creator_id OR (status = 'waiting' AND auth.uid() IS NOT NULL));

-- Policy: Users can cancel their own challenges
CREATE POLICY "Users can delete their own challenges"
ON public.ludo_public_challenges
FOR DELETE
USING (auth.uid() = creator_id);

-- Create index for faster queries
CREATE INDEX idx_ludo_public_challenges_status ON public.ludo_public_challenges(status);
CREATE INDEX idx_ludo_public_challenges_creator ON public.ludo_public_challenges(creator_id);
CREATE INDEX idx_ludo_public_challenges_expires ON public.ludo_public_challenges(expires_at);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_public_challenges;