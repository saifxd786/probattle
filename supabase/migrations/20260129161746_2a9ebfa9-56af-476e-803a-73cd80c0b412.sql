-- Create function to auto-reject old processing deposits
CREATE OR REPLACE FUNCTION public.auto_reject_stale_deposits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stale_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate 5 hours ago
  stale_cutoff := now() - INTERVAL '5 hours';
  
  -- Update all processing deposits older than 5 hours to cancelled
  UPDATE public.transactions
  SET 
    status = 'cancelled',
    admin_note = COALESCE(admin_note, '') || ' [Auto-rejected: Processing for more than 5 hours]',
    updated_at = now()
  WHERE type = 'deposit'
    AND status = 'processing'
    AND created_at < stale_cutoff;
  
  RETURN NULL;
END;
$$;

-- Create a function that can be called periodically to clean up stale deposits
CREATE OR REPLACE FUNCTION public.cleanup_stale_processing_deposits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stale_cutoff TIMESTAMP WITH TIME ZONE;
  affected_count INTEGER;
BEGIN
  -- Calculate 5 hours ago
  stale_cutoff := now() - INTERVAL '5 hours';
  
  -- Update all processing deposits older than 5 hours to cancelled
  WITH updated AS (
    UPDATE public.transactions
    SET 
      status = 'cancelled',
      admin_note = COALESCE(admin_note, '') || ' [Auto-rejected: Processing for more than 5 hours]',
      updated_at = now()
    WHERE type = 'deposit'
      AND status = 'processing'
      AND created_at < stale_cutoff
    RETURNING id, user_id
  )
  SELECT COUNT(*) INTO affected_count FROM updated;
  
  -- Create notifications for affected users
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT 
    t.user_id,
    'deposit_rejected',
    '❌ Deposit Rejected',
    'Your deposit request of ₹' || t.amount || ' was auto-rejected after 5 hours of processing. Please try again or contact support.'
  FROM public.transactions t
  WHERE t.type = 'deposit'
    AND t.status = 'cancelled'
    AND t.admin_note LIKE '%Auto-rejected%'
    AND t.updated_at > now() - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'rejected_count', affected_count);
END;
$$;

-- Create trigger to check on any transaction update (this will run cleanup periodically)
CREATE OR REPLACE FUNCTION public.check_stale_deposits_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Run cleanup in background (only 1% of the time to avoid overhead)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_stale_processing_deposits();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_check_stale_deposits ON public.transactions;
CREATE TRIGGER trigger_check_stale_deposits
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stale_deposits_on_activity();