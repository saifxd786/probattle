-- Create daily login settings table
CREATE TABLE IF NOT EXISTS public.daily_login_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  daily_coins INTEGER NOT NULL DEFAULT 10,
  streak_bonus_coins INTEGER NOT NULL DEFAULT 50,
  coins_to_rupees_ratio INTEGER NOT NULL DEFAULT 10,
  min_coins_to_convert INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_login_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Daily login settings are readable by everyone" 
ON public.daily_login_settings 
FOR SELECT 
USING (true);

-- Allow admins to update settings
CREATE POLICY "Admins can update daily login settings" 
ON public.daily_login_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default settings
INSERT INTO public.daily_login_settings (is_enabled, daily_coins, streak_bonus_coins, coins_to_rupees_ratio, min_coins_to_convert)
VALUES (true, 10, 50, 10, 100)
ON CONFLICT DO NOTHING;

-- Add required_deposit column to spin_wheel_settings if not exists
ALTER TABLE public.spin_wheel_settings 
ADD COLUMN IF NOT EXISTS required_deposit INTEGER NOT NULL DEFAULT 1000;

-- Add segment values column
ALTER TABLE public.spin_wheel_settings 
ADD COLUMN IF NOT EXISTS segment_values INTEGER[] NOT NULL DEFAULT ARRAY[10, 20, 100, 300, 500, 1000, 5000];