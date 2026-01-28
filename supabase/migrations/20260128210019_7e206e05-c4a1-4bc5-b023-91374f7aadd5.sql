-- Add gun_category column to matches table for TDM weapon restrictions
ALTER TABLE public.matches 
ADD COLUMN gun_category TEXT DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.matches.gun_category IS 'Weapon restriction for TDM matches: m416_only, shotgun_only, any_gun';