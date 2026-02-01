-- Create Classic Match Schedule Settings table (same structure as TDM)
CREATE TABLE public.classic_schedule_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_times TEXT[] NOT NULL DEFAULT ARRAY['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '22:00', '23:00'],
  entry_fee INTEGER NOT NULL DEFAULT 30,
  prize_pool INTEGER NOT NULL DEFAULT 100,
  max_slots INTEGER NOT NULL DEFAULT 100,
  map_name TEXT DEFAULT 'erangel',
  first_place_prize INTEGER DEFAULT 50,
  second_place_prize INTEGER DEFAULT 30,
  third_place_prize INTEGER DEFAULT 20,
  prize_per_kill INTEGER DEFAULT 5,
  auto_cancel_seconds INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.classic_schedule_settings (
  is_enabled, 
  schedule_times, 
  entry_fee, 
  prize_pool, 
  max_slots, 
  map_name,
  first_place_prize,
  second_place_prize,
  third_place_prize,
  prize_per_kill,
  auto_cancel_seconds
) VALUES (
  false,
  ARRAY['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '22:00', '23:00'],
  30,
  100,
  100,
  'erangel',
  50,
  30,
  20,
  5,
  10
);

-- Enable RLS
ALTER TABLE public.classic_schedule_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Anyone can read classic schedule settings"
ON public.classic_schedule_settings
FOR SELECT
USING (true);

-- Only service role can update (via edge function)
CREATE POLICY "Service role can manage classic schedule settings"
ON public.classic_schedule_settings
FOR ALL
USING (true)
WITH CHECK (true);