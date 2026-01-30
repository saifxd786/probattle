-- Fix function search paths for security

-- 1. Fix check_device_status
CREATE OR REPLACE FUNCTION public.check_device_status(p_device_id TEXT)
RETURNS TABLE (
  is_banned BOOLEAN,
  ban_reason TEXT,
  is_flagged BOOLEAN,
  account_count INTEGER,
  max_accounts_reached BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(d.is_banned, false),
    d.ban_reason,
    COALESCE(d.is_flagged, false),
    COALESCE(d.account_count, 0),
    COALESCE(d.account_count >= 2, false)
  FROM public.devices d
  WHERE d.device_id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, false, 0, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix register_device
CREATE OR REPLACE FUNCTION public.register_device(
  p_device_id TEXT,
  p_platform TEXT,
  p_device_model TEXT DEFAULT NULL,
  p_os_version TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL,
  p_is_emulator BOOLEAN DEFAULT false,
  p_is_rooted BOOLEAN DEFAULT false
)
RETURNS TABLE (
  success BOOLEAN,
  device_banned BOOLEAN,
  ban_reason TEXT,
  account_count INTEGER,
  can_create_account BOOLEAN
) AS $$
DECLARE
  v_device RECORD;
  v_banned BOOLEAN := false;
  v_ban_reason TEXT := NULL;
  v_account_count INTEGER := 0;
BEGIN
  SELECT * INTO v_device FROM public.devices d WHERE d.device_id = p_device_id;
  
  IF v_device IS NULL THEN
    INSERT INTO public.devices (
      device_id, platform, device_model, os_version, app_version, 
      is_emulator, is_rooted, account_count
    ) VALUES (
      p_device_id, p_platform, p_device_model, p_os_version, p_app_version,
      p_is_emulator, p_is_rooted, 0
    )
    RETURNING * INTO v_device;
    
    v_account_count := 0;
  ELSE
    UPDATE public.devices SET
      last_seen_at = now(),
      device_model = COALESCE(p_device_model, public.devices.device_model),
      os_version = COALESCE(p_os_version, public.devices.os_version),
      app_version = COALESCE(p_app_version, public.devices.app_version),
      is_emulator = COALESCE(p_is_emulator, public.devices.is_emulator),
      is_rooted = COALESCE(p_is_rooted, public.devices.is_rooted),
      updated_at = now()
    WHERE public.devices.device_id = p_device_id;
    
    v_banned := v_device.is_banned;
    v_ban_reason := v_device.ban_reason;
    v_account_count := v_device.account_count;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    v_banned,
    v_ban_reason,
    v_account_count,
    (v_account_count < 2 AND NOT v_banned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix link_user_to_device
CREATE OR REPLACE FUNCTION public.link_user_to_device(
  p_user_id UUID,
  p_device_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_device RECORD;
  v_existing_link RECORD;
BEGIN
  SELECT * INTO v_device FROM public.devices d WHERE d.device_id = p_device_id;
  
  IF v_device IS NULL THEN
    RETURN QUERY SELECT false, 'Device not registered';
    RETURN;
  END IF;
  
  IF v_device.is_banned THEN
    RETURN QUERY SELECT false, 'Device is banned';
    RETURN;
  END IF;
  
  SELECT * INTO v_existing_link 
  FROM public.user_devices ud 
  WHERE ud.user_id = p_user_id AND ud.device_id = p_device_id;
  
  IF v_existing_link IS NOT NULL THEN
    UPDATE public.user_devices SET last_login_at = now()
    WHERE public.user_devices.user_id = p_user_id AND public.user_devices.device_id = p_device_id;
    
    RETURN QUERY SELECT true, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_device.account_count >= 2 THEN
    UPDATE public.devices SET
      is_flagged = true,
      flag_reason = 'Exceeded max account limit (attempted: ' || (v_device.account_count + 1) || ')',
      updated_at = now()
    WHERE public.devices.device_id = p_device_id;
    
    RETURN QUERY SELECT false, 'Maximum accounts reached for this device';
    RETURN;
  END IF;
  
  INSERT INTO public.user_devices (user_id, device_id, is_primary)
  VALUES (p_user_id, p_device_id, v_device.account_count = 0);
  
  UPDATE public.devices SET
    account_count = public.devices.account_count + 1,
    updated_at = now()
  WHERE public.devices.device_id = p_device_id;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Fix ban_device
CREATE OR REPLACE FUNCTION public.ban_device(
  p_device_id TEXT,
  p_reason TEXT,
  p_admin_id UUID,
  p_cascade_to_users BOOLEAN DEFAULT true
)
RETURNS TABLE (
  success BOOLEAN,
  affected_users INTEGER
) AS $$
DECLARE
  v_affected INTEGER := 0;
BEGIN
  UPDATE public.devices SET
    is_banned = true,
    ban_reason = p_reason,
    banned_at = now(),
    banned_by = p_admin_id,
    updated_at = now()
  WHERE public.devices.device_id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;
  
  IF p_cascade_to_users THEN
    UPDATE public.profiles SET
      is_banned = true,
      ban_reason = 'Device ban: ' || p_reason,
      banned_at = now()
    WHERE public.profiles.id IN (
      SELECT user_id FROM public.user_devices WHERE public.user_devices.device_id = p_device_id
    );
    
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT true, v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Fix unban_device
CREATE OR REPLACE FUNCTION public.unban_device(p_device_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.devices SET
    is_banned = false,
    ban_reason = NULL,
    banned_at = NULL,
    banned_by = NULL,
    updated_at = now()
  WHERE public.devices.device_id = p_device_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;