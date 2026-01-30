-- Add geolocation columns to user_login_sessions table for better device tracking
ALTER TABLE public.user_login_sessions 
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS isp TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS is_registration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS color_depth INTEGER,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS hardware_concurrency INTEGER,
ADD COLUMN IF NOT EXISTS device_memory DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS touch_support BOOLEAN,
ADD COLUMN IF NOT EXISTS webgl_renderer TEXT,
ADD COLUMN IF NOT EXISTS language TEXT;

-- Create index for faster queries on registration sessions
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_is_registration 
ON public.user_login_sessions(is_registration) WHERE is_registration = true;

-- Create index for IP-based lookups
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_ip_address 
ON public.user_login_sessions(ip_address);

-- Create index for device fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_user_login_sessions_device_fingerprint 
ON public.user_login_sessions(device_fingerprint);