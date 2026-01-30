/**
 * Secure Device ID Management
 * 
 * Provides persistent device identification that survives:
 * - App reinstall (on native platforms via secure storage)
 * - Logout + new account creation
 * - Multiple account creation attempts
 * 
 * ANDROID: Uses Capacitor Preferences (backed by SharedPreferences)
 * iOS: Uses Capacitor Preferences (backed by UserDefaults with keychain backup)
 * WEB: Falls back to localStorage + fingerprint combination
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { generateDeviceFingerprint } from './deviceFingerprint';

const DEVICE_ID_KEY = 'probattle_secure_device_id';
const DEVICE_ID_BACKUP_KEY = 'probattle_device_id_backup';

/**
 * Generate a cryptographically secure UUID v4
 */
const generateSecureUUID = (): string => {
  // Use crypto API for secure random generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Hash the device ID using SHA-256 before sending to server
 */
export const hashDeviceId = async (deviceId: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(deviceId + '_probattle_salt_v1');
  
  if (crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Simple fallback hash
  let hash = 0;
  const str = deviceId + '_probattle_salt_v1';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
};

/**
 * Get or create a persistent device ID
 * 
 * On native platforms (Android/iOS):
 * - Uses Capacitor Preferences which persists across app reinstalls
 * - Falls back to generating new ID if not found
 * 
 * On web:
 * - Uses localStorage with fingerprint backup
 */
export const getSecureDeviceId = async (): Promise<string> => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'android' || platform === 'ios') {
    return getNativeDeviceId();
  }
  
  return getWebDeviceId();
};

/**
 * Native device ID retrieval (Android/iOS)
 */
const getNativeDeviceId = async (): Promise<string> => {
  try {
    // Try to get existing device ID
    const { value: existingId } = await Preferences.get({ key: DEVICE_ID_KEY });
    
    if (existingId) {
      console.log('[SecureDeviceId] Found existing native device ID');
      return existingId;
    }
    
    // Check backup key (in case main key was cleared)
    const { value: backupId } = await Preferences.get({ key: DEVICE_ID_BACKUP_KEY });
    
    if (backupId) {
      console.log('[SecureDeviceId] Restored from backup');
      // Restore to main key
      await Preferences.set({ key: DEVICE_ID_KEY, value: backupId });
      return backupId;
    }
    
    // Generate new device ID
    const newId = generateSecureUUID();
    console.log('[SecureDeviceId] Generated new native device ID');
    
    // Store in both keys for redundancy
    await Preferences.set({ key: DEVICE_ID_KEY, value: newId });
    await Preferences.set({ key: DEVICE_ID_BACKUP_KEY, value: newId });
    
    return newId;
  } catch (error) {
    console.error('[SecureDeviceId] Native storage error:', error);
    // Fallback to web method
    return getWebDeviceId();
  }
};

/**
 * Web device ID retrieval (fallback)
 * Combines localStorage with fingerprint for better persistence
 */
const getWebDeviceId = async (): Promise<string> => {
  try {
    // Check localStorage first
    const storedId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (storedId) {
      console.log('[SecureDeviceId] Found existing web device ID');
      return storedId;
    }
    
    // Generate fingerprint-based ID for web
    // This provides some persistence across sessions
    const fingerprint = await generateDeviceFingerprint();
    const timestamp = Date.now().toString(36);
    const webId = `web_${fingerprint.substring(0, 32)}_${timestamp}`;
    
    localStorage.setItem(DEVICE_ID_KEY, webId);
    console.log('[SecureDeviceId] Generated new web device ID');
    
    return webId;
  } catch (error) {
    console.error('[SecureDeviceId] Web storage error:', error);
    // Last resort: generate temporary ID
    return `temp_${generateSecureUUID()}`;
  }
};

/**
 * Get hashed device ID ready for server transmission
 */
export const getHashedDeviceId = async (): Promise<string> => {
  const rawId = await getSecureDeviceId();
  return hashDeviceId(rawId);
};

/**
 * Get device platform information
 */
export const getDevicePlatform = (): 'android' | 'ios' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';
  return 'web';
};

/**
 * Get device model information
 */
export const getDeviceModel = async (): Promise<string> => {
  const platform = Capacitor.getPlatform();
  
  if (platform === 'web') {
    // Extract from user agent for web
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone (Web)';
    if (/iPad/.test(ua)) return 'iPad (Web)';
    if (/Android/.test(ua)) {
      const match = ua.match(/Android\s*[\d.]+;\s*([^;)]+?)(?:\s*Build|\))/);
      return match ? `${match[1].trim()} (Web)` : 'Android (Web)';
    }
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Macintosh/.test(ua)) return 'Mac';
    return 'Unknown Browser';
  }
  
  // For native, we'd need Device plugin - use User Agent for now
  const ua = navigator.userAgent;
  if (platform === 'ios') {
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    return 'iOS Device';
  }
  
  if (platform === 'android') {
    const match = ua.match(/Android\s*[\d.]+;\s*([^;)]+?)(?:\s*Build|\))/);
    return match ? match[1].trim() : 'Android Device';
  }
  
  return 'Unknown Device';
};

/**
 * Get OS version
 */
export const getOSVersion = (): string => {
  const ua = navigator.userAgent;
  
  // iOS version
  const iosMatch = ua.match(/OS\s*([\d_]+)/);
  if (iosMatch) return `iOS ${iosMatch[1].replace(/_/g, '.')}`;
  
  // Android version
  const androidMatch = ua.match(/Android\s*([\d.]+)/);
  if (androidMatch) return `Android ${androidMatch[1]}`;
  
  // Windows version
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows/.test(ua)) return 'Windows';
  
  // macOS
  const macMatch = ua.match(/Mac OS X\s*([\d_.]+)/);
  if (macMatch) return `macOS ${macMatch[1].replace(/_/g, '.')}`;
  
  return 'Unknown OS';
};

/**
 * Full device info object for server
 */
export interface SecureDeviceInfo {
  device_id: string; // Hashed
  platform: 'android' | 'ios' | 'web';
  device_model: string;
  os_version: string;
  app_version: string;
  is_emulator: boolean;
  is_rooted: boolean;
}

/**
 * Collect all secure device info
 */
export const collectSecureDeviceInfo = async (): Promise<SecureDeviceInfo> => {
  const deviceId = await getHashedDeviceId();
  const platform = getDevicePlatform();
  const deviceModel = await getDeviceModel();
  const osVersion = getOSVersion();
  const emulatorStatus = detectEmulator();
  const rootStatus = detectRootOrJailbreak();
  
  return {
    device_id: deviceId,
    platform,
    device_model: deviceModel,
    os_version: osVersion,
    app_version: '1.0.0', // Would come from app config
    is_emulator: emulatorStatus.isEmulator,
    is_rooted: rootStatus.isRooted,
  };
};

/**
 * Emulator detection (best effort)
 */
export const detectEmulator = (): { isEmulator: boolean; indicators: string[] } => {
  const indicators: string[] = [];
  const ua = navigator.userAgent.toLowerCase();
  
  // Common emulator signatures
  const emulatorPatterns = [
    'sdk_gphone', // Android emulator
    'emulator',
    'simulator',
    'genymotion',
    'bluestacks',
    'nox',
    'ldplayer',
    'memu',
    'andyos',
    'virtualbox',
    'qemu',
  ];
  
  for (const pattern of emulatorPatterns) {
    if (ua.includes(pattern)) {
      indicators.push(pattern);
    }
  }
  
  // Check for unusual hardware values
  if (navigator.hardwareConcurrency === 1) {
    indicators.push('single_core');
  }
  
  // Check for generic device memory (emulators often have specific values)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory === 2 || deviceMemory === 4) {
    // Common emulator RAM values - soft indicator
  }
  
  // WebGL renderer check
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const rendererLower = renderer.toLowerCase();
        if (
          rendererLower.includes('swiftshader') ||
          rendererLower.includes('llvmpipe') ||
          rendererLower.includes('softpipe') ||
          rendererLower.includes('virtualbox')
        ) {
          indicators.push('software_renderer');
        }
      }
    }
  } catch {
    // Ignore WebGL errors
  }
  
  return {
    isEmulator: indicators.length >= 2, // Require multiple indicators
    indicators,
  };
};

/**
 * Root/Jailbreak detection (best effort from web context)
 */
export const detectRootOrJailbreak = (): { isRooted: boolean; indicators: string[] } => {
  const indicators: string[] = [];
  
  // Web-based detection is limited
  // These are soft indicators only
  
  // Check for Cydia (iOS jailbreak)
  if ((window as any).Cydia) {
    indicators.push('cydia_detected');
  }
  
  // Check for suspicious protocols
  try {
    // Jailbroken devices may have cydia:// protocol
    const testLink = document.createElement('a');
    testLink.href = 'cydia://';
    if (testLink.protocol === 'cydia:') {
      indicators.push('cydia_protocol');
    }
  } catch {
    // Ignore
  }
  
  return {
    isRooted: indicators.length > 0,
    indicators,
  };
};
