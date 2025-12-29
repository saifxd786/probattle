-- Create transaction status enum
CREATE TYPE public.transaction_status AS ENUM ('processing', 'pending', 'completed', 'cancelled');

-- Create transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'prize', 'entry_fee', 'refund', 'admin_credit', 'admin_debit');

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  upi_id TEXT,
  description TEXT,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add phone column to profiles if not exists and add user_code for unique ID
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;

-- Generate unique user codes for existing users
UPDATE public.profiles 
SET user_code = 'PS' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE user_code IS NULL;

-- Create function to generate user code on profile creation
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'PS' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.user_code := new_code;
  RETURN NEW;
END;
$$;

-- Create trigger for user code generation
DROP TRIGGER IF EXISTS generate_user_code_trigger ON public.profiles;
CREATE TRIGGER generate_user_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.user_code IS NULL)
  EXECUTE FUNCTION public.generate_user_code();

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposit/withdrawal requests"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND type IN ('deposit', 'withdrawal'));

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all transactions"
ON public.transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updating transactions updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();