-- Add position-based prizes columns for Classic/Erangel matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS second_place_prize numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS third_place_prize numeric DEFAULT 0.00;

-- Add UTR field to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS utr_id text;