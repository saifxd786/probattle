-- Create match status enum
CREATE TYPE public.match_status AS ENUM ('upcoming', 'pending', 'live', 'completed', 'cancelled');

-- Create match type enum
CREATE TYPE public.match_type AS ENUM ('tdm_1v1', 'tdm_2v2', 'tdm_4v4', 'classic');

-- Create game enum
CREATE TYPE public.game_type AS ENUM ('bgmi', 'freefire', 'clash_royale', 'ludo');

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  game game_type NOT NULL DEFAULT 'bgmi',
  match_type match_type NOT NULL,
  status match_status NOT NULL DEFAULT 'upcoming',
  entry_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  prize_per_kill DECIMAL(10,2) DEFAULT 0.00,
  map_name TEXT,
  max_slots INTEGER NOT NULL DEFAULT 100,
  filled_slots INTEGER NOT NULL DEFAULT 0,
  match_time TIMESTAMP WITH TIME ZONE NOT NULL,
  room_id TEXT,
  room_password TEXT,
  rules TEXT,
  banner_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match registrations table
CREATE TABLE public.match_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_screenshot_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_registrations ENABLE ROW LEVEL SECURITY;

-- Matches policies: Everyone can view matches
CREATE POLICY "Anyone can view matches"
ON public.matches FOR SELECT
TO authenticated
USING (true);

-- Only admins can create/update/delete matches
CREATE POLICY "Admins can create matches"
ON public.matches FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update matches"
ON public.matches FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete matches"
ON public.matches FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Match registrations policies
CREATE POLICY "Users can view their own registrations"
ON public.match_registrations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all registrations"
ON public.match_registrations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can register for matches"
ON public.match_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
ON public.match_registrations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any registration"
ON public.match_registrations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete registrations"
ON public.match_registrations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updating matches updated_at
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update filled_slots when registration is approved
CREATE OR REPLACE FUNCTION public.update_match_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved = false OR OLD.is_approved IS NULL) THEN
    UPDATE public.matches 
    SET filled_slots = filled_slots + 1 
    WHERE id = NEW.match_id;
  ELSIF NEW.is_approved = false AND OLD.is_approved = true THEN
    UPDATE public.matches 
    SET filled_slots = filled_slots - 1 
    WHERE id = NEW.match_id AND filled_slots > 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for slot updates
CREATE TRIGGER on_registration_approval
  AFTER UPDATE ON public.match_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_match_slots();