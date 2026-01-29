-- Create table to track user login sessions with IP and device info
CREATE TABLE public.user_login_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  device_fingerprint TEXT,
  user_agent TEXT,
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_user_login_sessions_user_id ON public.user_login_sessions(user_id);
CREATE INDEX idx_user_login_sessions_ip ON public.user_login_sessions(ip_address);
CREATE INDEX idx_user_login_sessions_fingerprint ON public.user_login_sessions(device_fingerprint);

-- Create table for multi-account detection alerts
CREATE TABLE public.multi_account_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'ip_match', 'device_match', 'upi_match'
  identifier_value TEXT NOT NULL, -- The matching IP, fingerprint, or UPI
  user_ids UUID[] NOT NULL, -- Array of user IDs that share this identifier
  user_count INTEGER NOT NULL DEFAULT 2,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for alerts
CREATE INDEX idx_multi_account_alerts_type ON public.multi_account_alerts(alert_type);
CREATE INDEX idx_multi_account_alerts_resolved ON public.multi_account_alerts(is_resolved);
CREATE INDEX idx_multi_account_alerts_severity ON public.multi_account_alerts(severity);

-- Create table to track user UPI IDs used for withdrawals
CREATE TABLE public.user_upi_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upi_id TEXT NOT NULL,
  first_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER DEFAULT 1,
  UNIQUE(user_id, upi_id)
);

CREATE INDEX idx_user_upi_accounts_upi ON public.user_upi_accounts(upi_id);
CREATE INDEX idx_user_upi_accounts_user ON public.user_upi_accounts(user_id);

-- Enable RLS
ALTER TABLE public.user_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_account_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_upi_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can view all login sessions"
  ON public.user_login_sessions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own sessions"
  ON public.user_login_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage alerts"
  ON public.multi_account_alerts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view UPI accounts"
  ON public.user_upi_accounts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage UPI accounts"
  ON public.user_upi_accounts
  FOR ALL
  USING (true);

-- Function to log user session
CREATE OR REPLACE FUNCTION public.log_user_session(
  p_ip_address TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  
  -- Insert session log
  INSERT INTO user_login_sessions (user_id, ip_address, device_fingerprint, user_agent, device_name)
  VALUES (v_user_id, p_ip_address, p_device_fingerprint, p_user_agent, p_device_name);
  
  -- Update profile with device fingerprint
  IF p_device_fingerprint IS NOT NULL THEN
    UPDATE profiles SET device_fingerprint = p_device_fingerprint WHERE id = v_user_id;
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to detect and create multi-account alerts
CREATE OR REPLACE FUNCTION public.detect_multi_accounts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ip_matches RECORD;
  v_device_matches RECORD;
  v_upi_matches RECORD;
  v_alert_count INTEGER := 0;
  v_severity TEXT;
BEGIN
  -- Detect IP address matches (users sharing same IP)
  FOR v_ip_matches IN
    SELECT ip_address, array_agg(DISTINCT user_id) as user_ids, count(DISTINCT user_id) as user_count
    FROM user_login_sessions
    WHERE ip_address IS NOT NULL AND ip_address != ''
    GROUP BY ip_address
    HAVING count(DISTINCT user_id) > 1
  LOOP
    -- Determine severity based on count
    v_severity := CASE 
      WHEN v_ip_matches.user_count >= 5 THEN 'critical'
      WHEN v_ip_matches.user_count >= 3 THEN 'high'
      ELSE 'medium'
    END;
    
    -- Insert or update alert
    INSERT INTO multi_account_alerts (alert_type, identifier_value, user_ids, user_count, severity)
    VALUES ('ip_match', v_ip_matches.ip_address, v_ip_matches.user_ids, v_ip_matches.user_count, v_severity)
    ON CONFLICT DO NOTHING;
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  -- Detect device fingerprint matches
  FOR v_device_matches IN
    SELECT device_fingerprint, array_agg(DISTINCT user_id) as user_ids, count(DISTINCT user_id) as user_count
    FROM user_login_sessions
    WHERE device_fingerprint IS NOT NULL AND device_fingerprint != ''
    GROUP BY device_fingerprint
    HAVING count(DISTINCT user_id) > 1
  LOOP
    v_severity := CASE 
      WHEN v_device_matches.user_count >= 4 THEN 'critical'
      WHEN v_device_matches.user_count >= 2 THEN 'high'
      ELSE 'medium'
    END;
    
    INSERT INTO multi_account_alerts (alert_type, identifier_value, user_ids, user_count, severity)
    VALUES ('device_match', v_device_matches.device_fingerprint, v_device_matches.user_ids, v_device_matches.user_count, v_severity)
    ON CONFLICT DO NOTHING;
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  -- Detect UPI matches (multiple users using same UPI)
  FOR v_upi_matches IN
    SELECT upi_id, array_agg(DISTINCT user_id) as user_ids, count(DISTINCT user_id) as user_count
    FROM user_upi_accounts
    WHERE upi_id IS NOT NULL AND upi_id != ''
    GROUP BY upi_id
    HAVING count(DISTINCT user_id) > 1
  LOOP
    v_severity := 'critical'; -- UPI match is always critical
    
    INSERT INTO multi_account_alerts (alert_type, identifier_value, user_ids, user_count, severity)
    VALUES ('upi_match', v_upi_matches.upi_id, v_upi_matches.user_ids, v_upi_matches.user_count, v_severity)
    ON CONFLICT DO NOTHING;
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'alerts_created', v_alert_count);
END;
$$;

-- Trigger to track UPI from withdrawals
CREATE OR REPLACE FUNCTION public.track_withdrawal_upi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type = 'withdrawal' AND NEW.upi_id IS NOT NULL AND NEW.upi_id != '' THEN
    INSERT INTO user_upi_accounts (user_id, upi_id)
    VALUES (NEW.user_id, NEW.upi_id)
    ON CONFLICT (user_id, upi_id) 
    DO UPDATE SET last_used_at = now(), usage_count = user_upi_accounts.usage_count + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_withdrawal_upi_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION track_withdrawal_upi();