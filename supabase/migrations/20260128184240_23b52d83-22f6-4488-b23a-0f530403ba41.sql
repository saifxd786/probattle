-- Add notification_permission_granted column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_permission_granted BOOLEAN DEFAULT false;

-- Add push_token for future APK push notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;