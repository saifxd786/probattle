-- Add BGMI player info columns to match_registrations
ALTER TABLE public.match_registrations 
ADD COLUMN IF NOT EXISTS bgmi_ingame_name TEXT,
ADD COLUMN IF NOT EXISTS bgmi_player_id TEXT,
ADD COLUMN IF NOT EXISTS bgmi_player_level INTEGER;