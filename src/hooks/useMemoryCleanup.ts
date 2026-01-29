import { useEffect, useCallback } from 'react';

/**
 * Hook to help with memory management and cleanup
 * - Clears unused data from memory periodically
 * - Handles visibility change to pause/resume operations
 */
export const useMemoryCleanup = () => {
  const clearUnusedCache = useCallback(() => {
    // Clear old console logs in development
    if (import.meta.env.DEV) {
      console.clear();
    }
    
    // Trigger garbage collection hint (browser may ignore)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // gc not available in all browsers
      }
    }
  }, []);

  useEffect(() => {
    // Run cleanup every 5 minutes when tab is visible
    let cleanupInterval: NodeJS.Timeout | null = null;

    const startCleanup = () => {
      if (cleanupInterval) return;
      cleanupInterval = setInterval(clearUnusedCache, 5 * 60 * 1000);
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
      } else {
        stopCleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    if (document.visibilityState === 'visible') {
      startCleanup();
    }

    return () => {
      stopCleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearUnusedCache]);
};

export default useMemoryCleanup;
