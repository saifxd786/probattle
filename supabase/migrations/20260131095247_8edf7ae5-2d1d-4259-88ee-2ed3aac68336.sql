CREATE OR REPLACE FUNCTION public.cleanup_stale_processing_deposits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stale_cutoff TIMESTAMP WITH TIME ZONE;
  affected_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Calculate 5 hours ago
  stale_cutoff := now() - INTERVAL '5 hours';
  
  -- Loop through stale deposits (both PENDING and PROCESSING) and process each one
  FOR v_record IN
    SELECT t.id, t.user_id, t.amount, t.created_at, t.status, p.username
    FROM public.transactions t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    WHERE t.type = 'deposit'
      AND t.status IN ('pending', 'processing')
      AND t.created_at < stale_cutoff
  LOOP
    -- Update transaction status
    UPDATE public.transactions
    SET 
      status = 'cancelled',
      admin_note = COALESCE(admin_note, '') || ' [Auto-rejected: ' || v_record.status || ' for more than 5 hours]',
      updated_at = now()
    WHERE id = v_record.id;
    
    -- Create audit log entry
    INSERT INTO public.admin_audit_logs (action_type, entity_type, entity_id, user_id, details, performed_by)
    VALUES (
      'auto_reject_deposit',
      'transaction',
      v_record.id,
      v_record.user_id,
      jsonb_build_object(
        'amount', v_record.amount,
        'username', v_record.username,
        'original_created_at', v_record.created_at,
        'original_status', v_record.status,
        'reason', v_record.status || ' for more than 5 hours',
        'hours_stale', EXTRACT(EPOCH FROM (now() - v_record.created_at)) / 3600
      ),
      'system_cron'
    );
    
    -- Create simple notification for user (no reason shown)
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_record.user_id,
      'error',
      '❌ Deposit Rejected',
      'Your deposit request of ₹' || v_record.amount || ' was rejected.'
    );
    
    affected_count := affected_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'rejected_count', affected_count);
END;
$$;