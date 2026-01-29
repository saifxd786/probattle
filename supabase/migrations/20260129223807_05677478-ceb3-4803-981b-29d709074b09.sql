-- Create storage bucket for payment assets (QR codes, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-assets', 'payment-assets', true);

-- Allow anyone to view payment assets (public bucket)
CREATE POLICY "Anyone can view payment assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-assets');

-- Only admins can upload/update/delete payment assets
CREATE POLICY "Admins can manage payment assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update payment assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete payment assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-assets' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add payment QR setting to app_settings
INSERT INTO public.app_settings (key, value) 
VALUES ('payment_qr', '{"url": null, "enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;