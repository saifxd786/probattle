/**
 * ULTRA-RELIABLE UPDATE CHECKER
 * 
 * Multi-layer cache bypass for instant version detection:
 * 1. Aggressive cache-busting with timestamp + random
 * 2. Fetch with cache: 'reload' to bypass browser cache
 * 3. Multiple parallel requests for reliability
 * 4. Service worker bypass via fetch credentials
 */

import { APP_VERSION } from '@/constants/appVersion';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  serverVersion: string | null;
  currentVersion: string;
  error?: string;
}

// Generate ultra-unique cache buster
const generateCacheBuster = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const nonce = crypto.randomUUID?.() || `${timestamp}-${random}`;
  return `t=${timestamp}&r=${random}&n=${nonce}`;
};

// Fetch version with aggressive cache bypass
const fetchVersionDirect = async (attempt: number = 1): Promise<string | null> => {
  const cacheBuster = generateCacheBuster();
  // Use absolute URL for native apps, relative for web
  const baseUrl = 'https://probattle.lovable.app';
  const url = `${baseUrl}/version.json?${cacheBuster}&attempt=${attempt}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      cache: 'reload', // Force network fetch, bypass all caches
      credentials: 'same-origin', // Include credentials to bypass SW in some cases
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Custom header to signal SW to not cache this
        'X-No-Cache': 'true',
        'X-Update-Check': Date.now().toString(),
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`[UpdateChecker] Attempt ${attempt} failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data.version || null;
  } catch (error) {
    console.log(`[UpdateChecker] Attempt ${attempt} error:`, error);
    return null;
  }
};

// Parallel fetch with multiple strategies
const fetchVersionParallel = async (): Promise<string | null> => {
  // Launch 3 parallel requests with different cache busters
  const attempts = [
    fetchVersionDirect(1),
    fetchVersionDirect(2),
    fetchVersionDirect(3),
  ];
  
  // Return first successful result
  const results = await Promise.allSettled(attempts);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  
  return null;
};

// Main update check function - INSTANT and RELIABLE
export const checkForUpdateInstant = async (): Promise<UpdateCheckResult> => {
  console.log(`[UpdateChecker] Starting instant check. Current: ${APP_VERSION}`);
  
  const startTime = performance.now();
  
  try {
    // Parallel fetch for maximum reliability
    const serverVersion = await fetchVersionParallel();
    
    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[UpdateChecker] Completed in ${elapsed}ms. Server: ${serverVersion}`);
    
    if (!serverVersion) {
      return {
        hasUpdate: false,
        serverVersion: null,
        currentVersion: APP_VERSION,
        error: 'Could not fetch server version',
      };
    }
    
    const hasUpdate = serverVersion !== APP_VERSION;
    
    console.log(`[UpdateChecker] Result: ${hasUpdate ? 'UPDATE AVAILABLE' : 'UP TO DATE'}`);
    
    return {
      hasUpdate,
      serverVersion,
      currentVersion: APP_VERSION,
    };
  } catch (error) {
    console.error('[UpdateChecker] Critical error:', error);
    return {
      hasUpdate: false,
      serverVersion: null,
      currentVersion: APP_VERSION,
      error: String(error),
    };
  }
};

// Trigger service worker update check (background)
export const triggerSWUpdate = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      // Trigger update check
      await reg.update();
      return reg;
    }
  } catch (error) {
    console.log('[UpdateChecker] SW update trigger failed:', error);
  }
  
  return null;
};
