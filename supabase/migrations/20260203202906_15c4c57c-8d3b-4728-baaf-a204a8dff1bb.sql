-- Add gateway settings to app_settings
INSERT INTO app_settings (key, value) 
VALUES ('gateway_settings', '{"manual_enabled": true, "auto_enabled": true, "corex_enabled": true, "imb_enabled": true}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();