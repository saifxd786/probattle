-- Add game-specific bans and device fingerprint to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned_games text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS device_fingerprint text;

-- Create device bans table
CREATE TABLE IF NOT EXISTS public.device_bans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint text NOT NULL UNIQUE,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  banned_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_bans ENABLE ROW LEVEL SECURITY;

-- Policies for device_bans
CREATE POLICY "Admins can manage device bans"
ON public.device_bans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can check device ban"
ON public.device_bans
FOR SELECT
USING (true);

-- Create index on device_fingerprint for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint ON public.profiles(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_bans_fingerprint ON public.device_bans(device_fingerprint);