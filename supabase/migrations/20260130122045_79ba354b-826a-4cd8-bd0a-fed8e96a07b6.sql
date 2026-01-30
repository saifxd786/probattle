-- =============================================
-- DEVICE TRACKING & BAN SYSTEM
-- =============================================

-- 1. Create devices table (tracks unique hardware devices)
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE, -- SHA-256 hashed device UUID
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_model TEXT, -- e.g., "Samsung Galaxy S21", "iPhone 14"
  os_version TEXT,
  app_version TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  account_count INTEGER NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  banned_by UUID REFERENCES auth.users(id),
  is_emulator BOOLEAN DEFAULT false,
  is_rooted BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create user_devices junction table (maps users to devices)
CREATE TABLE public.user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(user_id, device_id)
);

-- 3. Create indexes for fast lookups
CREATE INDEX idx_devices_device_id ON public.devices(device_id);
CREATE INDEX idx_devices_is_banned ON public.devices(is_banned) WHERE is_banned = true;
CREATE INDEX idx_devices_is_flagged ON public.devices(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON public.user_devices(device_id);

-- 4. Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for devices (admin only for writes, read own device)
CREATE POLICY "Users can view their own linked devices"
  ON public.devices FOR SELECT
  USING (
    device_id IN (
      SELECT ud.device_id FROM public.user_devices ud WHERE ud.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for user_devices
CREATE POLICY "Users can view their own device links"
  ON public.user_devices FOR SELECT
  USING (user_id = auth.uid());

-- 7. Function to check if device is banned (used in pre-auth check)
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
  
  -- If device not found, return defaults (new device)
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, false, 0, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to register/update device
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
  -- Check if device exists
  SELECT * INTO v_device FROM public.devices d WHERE d.device_id = p_device_id;
  
  IF v_device IS NULL THEN
    -- New device - create it
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
    -- Existing device - update last seen
    UPDATE public.devices SET
      last_seen_at = now(),
      device_model = COALESCE(p_device_model, device_model),
      os_version = COALESCE(p_os_version, os_version),
      app_version = COALESCE(p_app_version, app_version),
      is_emulator = COALESCE(p_is_emulator, is_emulator),
      is_rooted = COALESCE(p_is_rooted, is_rooted),
      updated_at = now()
    WHERE device_id = p_device_id;
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to link user to device (called after successful signup)
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
  -- Get device
  SELECT * INTO v_device FROM public.devices d WHERE d.device_id = p_device_id;
  
  IF v_device IS NULL THEN
    RETURN QUERY SELECT false, 'Device not registered';
    RETURN;
  END IF;
  
  -- Check if device is banned
  IF v_device.is_banned THEN
    RETURN QUERY SELECT false, 'Device is banned';
    RETURN;
  END IF;
  
  -- Check if already linked
  SELECT * INTO v_existing_link 
  FROM public.user_devices ud 
  WHERE ud.user_id = p_user_id AND ud.device_id = p_device_id;
  
  IF v_existing_link IS NOT NULL THEN
    -- Update last login
    UPDATE public.user_devices SET last_login_at = now()
    WHERE user_id = p_user_id AND device_id = p_device_id;
    
    RETURN QUERY SELECT true, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check account limit (max 2)
  IF v_device.account_count >= 2 THEN
    -- Flag the device for abuse
    UPDATE public.devices SET
      is_flagged = true,
      flag_reason = 'Exceeded max account limit (attempted: ' || (v_device.account_count + 1) || ')',
      updated_at = now()
    WHERE device_id = p_device_id;
    
    RETURN QUERY SELECT false, 'Maximum accounts reached for this device';
    RETURN;
  END IF;
  
  -- Create link
  INSERT INTO public.user_devices (user_id, device_id, is_primary)
  VALUES (p_user_id, p_device_id, v_device.account_count = 0);
  
  -- Increment account count
  UPDATE public.devices SET
    account_count = account_count + 1,
    updated_at = now()
  WHERE device_id = p_device_id;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to ban device (admin only)
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
  -- Ban the device
  UPDATE public.devices SET
    is_banned = true,
    ban_reason = p_reason,
    banned_at = now(),
    banned_by = p_admin_id,
    updated_at = now()
  WHERE device_id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;
  
  -- Optionally cascade ban to all users on this device
  IF p_cascade_to_users THEN
    UPDATE public.profiles SET
      is_banned = true,
      ban_reason = 'Device ban: ' || p_reason,
      banned_at = now()
    WHERE id IN (
      SELECT user_id FROM public.user_devices WHERE device_id = p_device_id
    );
    
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT true, v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to unban device
CREATE OR REPLACE FUNCTION public.unban_device(p_device_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.devices SET
    is_banned = false,
    ban_reason = NULL,
    banned_at = NULL,
    banned_by = NULL,
    updated_at = now()
  WHERE device_id = p_device_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger to update timestamps
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Add device_id to existing device_bans table migration check
-- (Keep existing device_bans for backward compatibility, but prefer new devices table)