-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- Create payments table for IMB gateway
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  gateway TEXT NOT NULL DEFAULT 'IMB',
  imb_transaction_id TEXT,
  webhook_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast order_id lookups (for webhooks)
CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- Create index for user payments
CREATE INDEX idx_payments_user_id ON public.payments(user_id);

-- Create webhook logs table for audit trail
CREATE TABLE public.payment_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature TEXT,
  is_valid BOOLEAN,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on webhook logs
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
ON public.payment_webhook_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));