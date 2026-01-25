-- Add expiry to device_bans table
ALTER TABLE public.device_bans 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create error_logs table for tracking auth errors
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT NULL,
  user_id UUID DEFAULT NULL,
  device_fingerprint TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_error_logs_correlation_id ON public.error_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view error logs
CREATE POLICY "Admins can view error logs"
ON public.error_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert error logs (for anonymous error tracking)
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Admins can delete error logs
CREATE POLICY "Admins can delete error logs"
ON public.error_logs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add index for device_bans expiry lookups
CREATE INDEX IF NOT EXISTS idx_device_bans_expires_at ON public.device_bans(expires_at);

-- Function to check if device is banned (considering expiry)
CREATE OR REPLACE FUNCTION public.is_device_banned(fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_bans
    WHERE device_fingerprint = fingerprint
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;