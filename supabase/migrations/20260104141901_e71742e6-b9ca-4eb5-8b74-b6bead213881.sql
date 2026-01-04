-- Add reward multipliers for each difficulty level
ALTER TABLE public.thimble_settings 
ADD COLUMN IF NOT EXISTS reward_multiplier_easy numeric DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS reward_multiplier_hard numeric DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS reward_multiplier_impossible numeric DEFAULT 3.0;