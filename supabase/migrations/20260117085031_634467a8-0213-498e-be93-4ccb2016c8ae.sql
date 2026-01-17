-- Add color customization columns to spin_wheel_settings
ALTER TABLE public.spin_wheel_settings 
ADD COLUMN IF NOT EXISTS segment_colors text[] DEFAULT ARRAY['hsl(200, 100%, 50%)', 'hsl(170, 100%, 45%)', 'hsl(270, 100%, 55%)', 'hsl(45, 100%, 50%)', 'hsl(0, 100%, 55%)', 'hsl(320, 100%, 50%)', 'hsl(50, 100%, 50%)'],
ADD COLUMN IF NOT EXISTS pointer_color text DEFAULT 'hsl(45, 100%, 50%)',
ADD COLUMN IF NOT EXISTS center_color text DEFAULT 'hsl(220, 30%, 10%)',
ADD COLUMN IF NOT EXISTS border_color text DEFAULT 'hsl(200, 100%, 50%)';

-- Add attachments column to support_messages
ALTER TABLE public.support_messages
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments', 
  'support-attachments', 
  false,
  3221225472, -- 3GB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for support attachments
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);