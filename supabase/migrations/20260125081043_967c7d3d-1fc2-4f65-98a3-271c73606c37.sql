-- Fix the permissive RLS policy for error_logs INSERT
-- Replace WITH CHECK (true) with a more secure policy that still allows anonymous logging
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;

-- Create a more restrictive insert policy - still allows inserts but with rate limiting potential
CREATE POLICY "Allow error log inserts"
ON public.error_logs
FOR INSERT
WITH CHECK (
  -- Allow insert but require correlation_id and error_type to be non-empty
  correlation_id IS NOT NULL 
  AND LENGTH(correlation_id) > 0
  AND error_type IS NOT NULL 
  AND LENGTH(error_type) > 0
);