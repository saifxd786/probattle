-- Create user_bank_cards table to store permanent bank card details
CREATE TABLE public.user_bank_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  account_holder_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bank_cards ENABLE ROW LEVEL SECURITY;

-- Users can only view their own bank card
CREATE POLICY "Users can view their own bank card"
ON public.user_bank_cards
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own bank card (one time only due to UNIQUE constraint)
CREATE POLICY "Users can insert their own bank card"
ON public.user_bank_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all bank cards
CREATE POLICY "Admins can view all bank cards"
ON public.user_bank_cards
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add index for faster lookups
CREATE INDEX idx_user_bank_cards_user_id ON public.user_bank_cards(user_id);