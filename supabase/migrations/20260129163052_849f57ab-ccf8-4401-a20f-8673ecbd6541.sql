-- Create audit logs table for admin tracking
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID,
  details JSONB,
  performed_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.admin_audit_logs(user_id);

-- Update cleanup function to log each auto-rejection
CREATE OR REPLACE FUNCTION public.cleanup_stale_processing_deposits()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  stale_cutoff TIMESTAMP WITH TIME ZONE;
  affected_count INTEGER;
  v_record RECORD;
BEGIN
  -- Calculate 5 hours ago
  stale_cutoff := now() - INTERVAL '5 hours';
  
  -- Loop through stale deposits and process each one
  FOR v_record IN
    SELECT t.id, t.user_id, t.amount, t.created_at, p.username
    FROM public.transactions t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    WHERE t.type = 'deposit'
      AND t.status = 'processing'
      AND t.created_at < stale_cutoff
  LOOP
    -- Update transaction status
    UPDATE public.transactions
    SET 
      status = 'cancelled',
      admin_note = COALESCE(admin_note, '') || ' [Auto-rejected: Processing for more than 5 hours]',
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
        'reason', 'Processing for more than 5 hours',
        'hours_stale', EXTRACT(EPOCH FROM (now() - v_record.created_at)) / 3600
      ),
      'system_cron'
    );
    
    -- Create notification for user
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_record.user_id,
      'deposit_rejected',
      '❌ Deposit Rejected',
      'Your deposit request of ₹' || v_record.amount || ' was rejected. Please try again or contact support.'
    );
  END LOOP;
  
  -- Get count of affected records
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN json_build_object('success', true, 'rejected_count', affected_count);
END;
$function$;