-- Fix: Drop the SECURITY DEFINER view and recreate as INVOKER
DROP VIEW IF EXISTS public.todays_scheduled_matches;

CREATE OR REPLACE VIEW public.todays_scheduled_matches 
WITH (security_invoker = true)
AS
SELECT 
  m.*,
  CASE 
    WHEN m.filled_slots >= m.max_slots THEN 'full'
    WHEN m.filled_slots > 0 THEN 'partially_filled'
    ELSE 'empty'
  END as fill_status
FROM matches m
WHERE m.is_auto_scheduled = true
  AND DATE(m.match_time AT TIME ZONE 'Asia/Kolkata') = DATE(now() AT TIME ZONE 'Asia/Kolkata')
ORDER BY m.match_time ASC;