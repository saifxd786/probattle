// Comprehensive device information collection for registration and login tracking
import { generateDeviceFingerprint } from './deviceFingerprint';

export interface ExtendedDeviceInfo {
  device_fingerprint: string;
  user_agent: string;
  device_name: string;
  screen_resolution: string;
  color_depth: number;
  platform: string;
  hardware_concurrency: number;
  device_memory: number;
  touch_support: boolean;
  webgl_renderer: string;
  language: string;
}

// Detect device name from user agent
export const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  
  // iOS devices
  if (/iPhone/.test(ua)) {
    const match = ua.match(/iPhone\s*(?:OS\s*)?(\d+)?/);
    return match ? `iPhone (iOS ${match[1] || 'Unknown'})` : 'iPhone';
  }
  if (/iPad/.test(ua)) {
    return 'iPad';
  }
  
  // Android devices - try to get model name
  if (/Android/.test(ua)) {
    // Pattern: Android X.X; MODEL Build/
    const match = ua.match(/Android\s*[\d.]+;\s*([^;)]+?)(?:\s*Build|\))/);
    if (match && match[1]) {
      const model = match[1].trim();
      // Clean up common patterns
      const cleanModel = model
        .replace(/^\s*;\s*/, '')
        .replace(/\s*$/, '')
        .substring(0, 50); // Limit length
      return cleanModel || 'Android Device';
    }
    return 'Android Device';
  }
  
  // Desktop browsers
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11 PC';
  if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1 PC';
  if (/Windows NT 6.2/.test(ua)) return 'Windows 8 PC';
  if (/Windows NT 6.1/.test(ua)) return 'Windows 7 PC';
  if (/Windows/.test(ua)) return 'Windows PC';
  
  if (/Macintosh/.test(ua)) {
    if (/Mac OS X 10_15/.test(ua)) return 'Mac (Catalina)';
    if (/Mac OS X 11/.test(ua) || /Mac OS X 12/.test(ua)) return 'Mac (Big Sur+)';
    return 'Mac';
  }
  
  if (/CrOS/.test(ua)) return 'Chromebook';
  if (/Linux/.test(ua)) return 'Linux PC';
  
  return 'Unknown Device';
};

// Get WebGL renderer info
const getWebGLRenderer = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return renderer ? String(renderer).substring(0, 100) : 'Unknown';
      }
    }
    return 'No WebGL';
  } catch {
    return 'WebGL Error';
  }
};

// Collect comprehensive device information
export const collectExtendedDeviceInfo = async (): Promise<ExtendedDeviceInfo> => {
  const fingerprint = await generateDeviceFingerprint();
  
  return {
    device_fingerprint: fingerprint,
    user_agent: navigator.userAgent.substring(0, 500), // Limit length
    device_name: getDeviceName(),
    screen_resolution: `${screen.width}x${screen.height}`,
    color_depth: screen.colorDepth,
    platform: navigator.platform || 'Unknown',
    hardware_concurrency: navigator.hardwareConcurrency || 0,
    device_memory: (navigator as any).deviceMemory || 0,
    touch_support: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    webgl_renderer: getWebGLRenderer(),
    language: navigator.language || 'en',
  };
};

// Log device info to backend (for registration or login)
// This is a non-critical operation - failures should not break the app
export const logDeviceToServer = async (
  supabase: any, 
  isRegistration: boolean = false,
  retryCount: number = 0
): Promise<{ success: boolean; location?: string }> => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second

  try {
    // First check if we have a valid session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      console.log('[deviceInfo] No valid session, skipping device log');
      return { success: false };
    }

    const deviceInfo = await collectExtendedDeviceInfo();
    
    const { data, error } = await supabase.functions.invoke('log-registration-device', {
      body: {
        ...deviceInfo,
        is_registration: isRegistration,
      }
    });
    
    if (error) {
      // Handle 401 errors specifically - these are auth timing issues
      const is401 = error.message?.includes('401') || error.status === 401;
      
      if (is401 && retryCount < MAX_RETRIES) {
        console.log(`[deviceInfo] Auth not ready, retrying in ${RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return logDeviceToServer(supabase, isRegistration, retryCount + 1);
      }
      
      // Don't log 401s as errors - they're expected during auth transitions
      if (is401) {
        console.log('[deviceInfo] Skipping device log - auth session not ready');
        return { success: false };
      }
      
      console.error('[deviceInfo] Failed to log device:', error);
      return { success: false };
    }
    
    console.log('[deviceInfo] Device logged successfully:', data);
    return { 
      success: true, 
      location: data?.location || undefined 
    };
  } catch (error) {
    // Silently fail - this is a non-critical feature
    console.log('[deviceInfo] Device logging skipped:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false };
  }
};
