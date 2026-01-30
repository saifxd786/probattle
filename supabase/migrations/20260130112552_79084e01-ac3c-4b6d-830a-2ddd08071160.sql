-- Create atomic wallet update function to prevent race conditions
CREATE OR REPLACE FUNCTION public.atomic_wallet_update(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate new balance
  v_new_balance := GREATEST(0, v_current_balance + p_amount);
  
  -- Prevent negative balance for debits
  IF p_amount < 0 AND ABS(p_amount) > v_current_balance THEN
    RETURN QUERY SELECT false, v_current_balance, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;
  
  -- Update the balance atomically
  UPDATE profiles
  SET wallet_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Log the transaction in admin audit logs if admin_id provided
  IF p_admin_id IS NOT NULL THEN
    INSERT INTO admin_audit_logs (
      action_type,
      entity_type,
      entity_id,
      performed_by,
      user_id,
      details
    ) VALUES (
      CASE WHEN p_amount > 0 THEN 'WALLET_CREDIT' ELSE 'WALLET_DEBIT' END,
      'wallet',
      p_user_id::TEXT,
      p_admin_id,
      p_user_id,
      jsonb_build_object(
        'amount', p_amount,
        'old_balance', v_current_balance,
        'new_balance', v_new_balance,
        'reason', p_reason
      )
    );
  END IF;
  
  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- Create atomic referral reward function
CREATE OR REPLACE FUNCTION public.atomic_referral_reward(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_reward_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_exists BOOLEAN;
BEGIN
  -- Check if referral already rewarded (prevents double rewards)
  SELECT is_rewarded INTO v_referral_exists
  FROM referrals
  WHERE referrer_id = p_referrer_id 
    AND referred_id = p_referred_id
  FOR UPDATE;
  
  IF v_referral_exists IS TRUE THEN
    -- Already rewarded
    RETURN false;
  END IF;
  
  -- Atomic update: credit wallet and mark referral as rewarded in single transaction
  UPDATE profiles
  SET wallet_balance = wallet_balance + p_reward_amount,
      updated_at = NOW()
  WHERE id = p_referrer_id;
  
  UPDATE referrals
  SET is_rewarded = true,
      status = 'completed'
  WHERE referrer_id = p_referrer_id 
    AND referred_id = p_referred_id;
  
  RETURN true;
END;
$$;

-- Add server-side rate limiting table for persistent rate limits
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  ip_address TEXT,
  user_id UUID,
  attempts INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_key ON public.rate_limit_attempts(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON public.rate_limit_attempts(ip_address);

-- Cleanup old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- RLS for rate_limit_attempts - only service role can access
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- No public access to rate limit data
CREATE POLICY "No public access to rate limits"
  ON public.rate_limit_attempts
  FOR ALL
  USING (false);
