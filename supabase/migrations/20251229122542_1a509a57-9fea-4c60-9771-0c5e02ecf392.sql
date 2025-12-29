-- Create storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false);

-- Storage policy: Users can upload their own payment screenshots
CREATE POLICY "Users can upload payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy: Users can view their own screenshots
CREATE POLICY "Users can view own payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy: Admins can view all screenshots
CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Add screenshot_url column to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID, -- Can reference match_id, transaction_id, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System/Admins can create notifications for anyone
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can create their own notifications (for system triggers)
CREATE POLICY "Users can create own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);