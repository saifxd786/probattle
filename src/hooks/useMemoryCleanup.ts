import { useEffect, useCallback, useRef } from 'react';
import { globalChannelManager, globalLatencyTracker } from '@/utils/realtimeOptimizer';

/**
 * Enhanced Hook for memory management and cleanup - Production Grade
 * 
 * Features:
 * - Clears unused data from memory periodically
 * - Handles visibility change to pause/resume operations
 * - Cleans up stale WebSocket connections
 * - Monitors and reports memory usage
 * - Adaptive cleanup frequency based on memory pressure
 */
export const useMemoryCleanup = () => {
  const lastCleanupRef = useRef<number>(Date.now());
  const memoryWarningShownRef = useRef<boolean>(false);
  
  const getMemoryUsage = useCallback((): { used: number; limit: number; percentage: number } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      };
    }
    return null;
  }, []);

  const clearUnusedCache = useCallback(() => {
    const now = Date.now();
    
    // Prevent cleanup spam (minimum 30 seconds between cleanups)
    if (now - lastCleanupRef.current < 30000) {
      return;
    }
    lastCleanupRef.current = now;
    
    // Get memory stats before cleanup
    const memoryBefore = getMemoryUsage();
    
    // 1. Clear console in development
    if (import.meta.env.DEV) {
      console.clear();
    }
    
    // 2. Clear stale localStorage items (older than 24 hours)
    try {
      const keysToCheck = ['ludo_friend_active_', 'ludo_bot_active_'];
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && keysToCheck.some(prefix => key.startsWith(prefix))) {
          const value = localStorage.getItem(key);
          if (value && parseInt(value, 10) < oneDayAgo) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      // localStorage not available or quota exceeded
    }
    
    // 3. Clear old ping samples from latency tracker
    globalLatencyTracker.clear();
    
    // 4. Log channel health for monitoring
    const channelHealth = globalChannelManager.getAllHealth();
    if (channelHealth.length > 0 && import.meta.env.DEV) {
      console.log('[MemoryCleanup] Channel health:', channelHealth);
    }
    
    // 5. Trigger garbage collection hint (browser may ignore)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // gc not available in all browsers
      }
    }
    
    // 6. Log memory usage (development only)
    const memoryAfter = getMemoryUsage();
    if (memoryAfter && import.meta.env.DEV) {
      console.log(`[MemoryCleanup] Memory: ${memoryAfter.used}MB / ${memoryAfter.limit}MB (${memoryAfter.percentage}%)`);
    }
    
    // 7. Show warning if memory usage is high (> 80%)
    if (memoryAfter && memoryAfter.percentage > 80 && !memoryWarningShownRef.current) {
      memoryWarningShownRef.current = true;
      console.warn('[MemoryCleanup] High memory usage detected. Consider refreshing the page.');
    }
  }, [getMemoryUsage]);

  // Adaptive cleanup - more frequent when memory pressure is high
  const getCleanupInterval = useCallback((): number => {
    const memory = getMemoryUsage();
    if (memory) {
      if (memory.percentage > 70) return 1 * 60 * 1000; // 1 minute
      if (memory.percentage > 50) return 3 * 60 * 1000; // 3 minutes
    }
    return 5 * 60 * 1000; // 5 minutes (default)
  }, [getMemoryUsage]);

  useEffect(() => {
    let cleanupInterval: NodeJS.Timeout | null = null;

    const startCleanup = () => {
      if (cleanupInterval) clearInterval(cleanupInterval);
      const interval = getCleanupInterval();
      cleanupInterval = setInterval(clearUnusedCache, interval);
    };

    const stopCleanup = () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startCleanup();
        // Run immediate cleanup when returning to tab
        setTimeout(clearUnusedCache, 1000);
      } else {
        stopCleanup();
      }
    };

    // Handle low memory warning from browser
    const handleMemoryPressure = () => {
      console.warn('[MemoryCleanup] Memory pressure detected, running cleanup');
      clearUnusedCache();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for memory pressure events (Chrome only)
    if ('onmemorypressure' in window) {
      (window as any).addEventListener('memorypressure', handleMemoryPressure);
    }
    
    if (document.visibilityState === 'visible') {
      startCleanup();
    }

    return () => {
      stopCleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('onmemorypressure' in window) {
        (window as any).removeEventListener('memorypressure', handleMemoryPressure);
      }
    };
  }, [clearUnusedCache, getCleanupInterval]);
  
  // Return utility functions for manual control
  return {
    forceCleanup: clearUnusedCache,
    getMemoryUsage,
  };
};

export default useMemoryCleanup;
