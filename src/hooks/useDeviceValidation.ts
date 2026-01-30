/**
 * Device Validation Hook
 * 
 * Provides pre-auth device validation to block banned devices
 * before they can even attempt login or signup.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectSecureDeviceInfo, SecureDeviceInfo } from '@/utils/secureDeviceId';

export interface DeviceValidationResult {
  isLoading: boolean;
  isAllowed: boolean;
  isBanned: boolean;
  canCreateAccount: boolean;
  accountCount: number;
  reason?: string;
  error?: string;
  deviceInfo?: SecureDeviceInfo;
}

export interface UseDeviceValidationReturn extends DeviceValidationResult {
  revalidate: () => Promise<void>;
  linkUserToDevice: (userId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook for device validation
 * Call on app startup and before auth operations
 */
export const useDeviceValidation = (): UseDeviceValidationReturn => {
  const [state, setState] = useState<DeviceValidationResult>({
    isLoading: true,
    isAllowed: true, // Optimistic default
    isBanned: false,
    canCreateAccount: true,
    accountCount: 0,
  });

  const [deviceInfo, setDeviceInfo] = useState<SecureDeviceInfo | null>(null);

  const validateDevice = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Collect device info
      const info = await collectSecureDeviceInfo();
      setDeviceInfo(info);

      console.log('[DeviceValidation] Checking device:', info.device_id.substring(0, 16) + '...');

      // Call edge function to validate
      const { data, error } = await supabase.functions.invoke('validate-device', {
        body: {
          device_id: info.device_id,
          platform: info.platform,
          device_model: info.device_model,
          os_version: info.os_version,
          app_version: info.app_version,
          is_emulator: info.is_emulator,
          is_rooted: info.is_rooted,
          action: 'register', // Register/update device
        }
      });

      if (error) {
        console.error('[DeviceValidation] Validation error:', error);
        // On error, allow access (don't block legitimate users due to network issues)
        setState({
          isLoading: false,
          isAllowed: true,
          isBanned: false,
          canCreateAccount: true,
          accountCount: 0,
          error: error.message,
          deviceInfo: info,
        });
        return;
      }

      const result = data as {
        success: boolean;
        allowed: boolean;
        reason?: string;
        device_status?: {
          is_banned: boolean;
          is_flagged: boolean;
          account_count: number;
          can_create_account: boolean;
        };
      };

      console.log('[DeviceValidation] Result:', result);

      setState({
        isLoading: false,
        isAllowed: result.allowed,
        isBanned: result.device_status?.is_banned || false,
        canCreateAccount: result.device_status?.can_create_account ?? true,
        accountCount: result.device_status?.account_count ?? 0,
        reason: result.reason,
        deviceInfo: info,
      });

    } catch (err) {
      console.error('[DeviceValidation] Error:', err);
      // On error, allow access
      setState({
        isLoading: false,
        isAllowed: true,
        isBanned: false,
        canCreateAccount: true,
        accountCount: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
        deviceInfo: deviceInfo ?? undefined,
      });
    }
  }, []);

  // Run validation on mount
  useEffect(() => {
    validateDevice();
  }, [validateDevice]);

  // Link user to device after successful auth
  const linkUserToDevice = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!deviceInfo) {
      return { success: false, error: 'Device info not available' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-device', {
        body: {
          device_id: deviceInfo.device_id,
          platform: deviceInfo.platform,
          device_model: deviceInfo.device_model,
          os_version: deviceInfo.os_version,
          app_version: deviceInfo.app_version,
          is_emulator: deviceInfo.is_emulator,
          is_rooted: deviceInfo.is_rooted,
          action: 'link',
          user_id: userId,
        }
      });

      if (error) {
        console.error('[DeviceValidation] Link error:', error);
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; allowed: boolean; reason?: string };
      
      if (!result.allowed) {
        return { success: false, error: result.reason || 'Linking not allowed' };
      }

      console.log('[DeviceValidation] User linked to device');
      return { success: true };

    } catch (err) {
      console.error('[DeviceValidation] Link error:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [deviceInfo]);

  return {
    ...state,
    revalidate: validateDevice,
    linkUserToDevice,
  };
};

/**
 * Quick device check (for use before showing auth UI)
 * Returns immediately if device is banned
 */
export const checkDeviceStatus = async (): Promise<{
  allowed: boolean;
  reason?: string;
}> => {
  try {
    const info = await collectSecureDeviceInfo();
    
    const { data, error } = await supabase.functions.invoke('validate-device', {
      body: {
        device_id: info.device_id,
        platform: info.platform,
        action: 'check',
      }
    });

    if (error) {
      console.error('[checkDeviceStatus] Error:', error);
      return { allowed: true }; // Fail open
    }

    return {
      allowed: data?.allowed ?? true,
      reason: data?.reason,
    };

  } catch (err) {
    console.error('[checkDeviceStatus] Error:', err);
    return { allowed: true }; // Fail open
  }
};
