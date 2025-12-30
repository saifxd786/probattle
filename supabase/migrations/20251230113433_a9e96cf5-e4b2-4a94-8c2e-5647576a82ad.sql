-- Add wager_requirement field to profiles table
-- This tracks how much a user must use (in entry fees) before they can withdraw
ALTER TABLE public.profiles 
ADD COLUMN wager_requirement numeric DEFAULT 0.00;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.wager_requirement IS 'Amount user must spend on entry fees before they can withdraw. Increases with deposits, decreases when paying entry fees.';