-- Create table to store permanent BGMI account details
CREATE TABLE public.bgmi_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ingame_name TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_level INTEGER NOT NULL CHECK (player_level >= 30),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bgmi_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own BGMI profile (read-only after creation)
CREATE POLICY "Users can view their own BGMI profile" 
ON public.bgmi_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own BGMI profile (only once - enforced by UNIQUE constraint)
CREATE POLICY "Users can create their own BGMI profile" 
ON public.bgmi_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- NO UPDATE or DELETE policies - making it permanent and non-editable

-- Create index for faster lookups
CREATE INDEX idx_bgmi_profiles_user_id ON public.bgmi_profiles(user_id);

-- Add trigger for updated_at (even though updates won't be allowed via RLS, good practice)
CREATE TRIGGER update_bgmi_profiles_updated_at
BEFORE UPDATE ON public.bgmi_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();