-- Add secondary account columns to bgmi_profiles table
ALTER TABLE public.bgmi_profiles 
ADD COLUMN IF NOT EXISTS secondary_ingame_name TEXT,
ADD COLUMN IF NOT EXISTS secondary_player_id TEXT,
ADD COLUMN IF NOT EXISTS secondary_player_level INTEGER;