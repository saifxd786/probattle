-- Create enum for ludo match status
CREATE TYPE ludo_match_status AS ENUM ('waiting', 'in_progress', 'completed', 'cancelled');

-- Create enum for ludo difficulty
CREATE TYPE ludo_difficulty AS ENUM ('easy', 'normal', 'competitive');

-- Ludo game settings (admin controlled)
CREATE TABLE public.ludo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  min_entry_amount numeric NOT NULL DEFAULT 100,
  reward_multiplier numeric NOT NULL DEFAULT 1.5,
  difficulty ludo_difficulty NOT NULL DEFAULT 'normal',
  dice_randomness_weight numeric NOT NULL DEFAULT 0.5,
  new_user_boost boolean NOT NULL DEFAULT true,
  high_amount_competitive boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.ludo_settings (id) VALUES (gen_random_uuid());

-- Enable RLS on ludo_settings
ALTER TABLE public.ludo_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view ludo settings"
ON public.ludo_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update ludo settings"
ON public.ludo_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));