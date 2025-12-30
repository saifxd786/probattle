-- Add ban reason and date to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ban_reason text,
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone;