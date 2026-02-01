import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { APP_VERSION } from '@/constants/appVersion';
import { checkForUpdateInstant, triggerSWUpdate } from '@/utils/updateChecker';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const checkInProgress = useRef(false);

  // INSTANT & RELIABLE update check
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    // Prevent duplicate checks
    if (checkInProgress.current) {
      console.log('[Update] Check already in progress, skipping');
      return false;
    }
    
    checkInProgress.current = true;
    setIsChecking(true);
    
    console.log('[Update] Starting instant check...');
    
    try {
      // INSTANT version check with parallel requests
      const result = await checkForUpdateInstant();
      
      if (result.hasUpdate && result.serverVersion) {
        console.log('[Update] UPDATE FOUND:', result.serverVersion);
        
        // Trigger SW update in background
        const reg = await triggerSWUpdate();
        if (reg) {
          setRegistration(reg);
        }
        
        setUpdateAvailable(true);
        toast({
          title: "Update Available! 🎉",
          description: `New version ${result.serverVersion} ready. Tap 'Apply Update' to install.`,
        });
        
        setIsChecking(false);
        checkInProgress.current = false;
        return true;
      }
      
      // Also check for waiting SW (edge case)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            setRegistration(reg);
            
            if (reg.waiting) {
              console.log('[Update] Found waiting service worker');
              setUpdateAvailable(true);
              toast({
                title: "Update Available! 🎉",
                description: "A new version is ready. Tap 'Apply Update' to install.",
              });
              setIsChecking(false);
              checkInProgress.current = false;
              return true;
            }
          }
        } catch (e) {
          console.log('[Update] SW check failed:', e);
        }
      }

      // No update found
      console.log('[Update] No update available');
      toast({
        title: "You're Up to Date ✓",
        description: `Running latest version v${APP_VERSION}`,
      });
      
      setIsChecking(false);
      checkInProgress.current = false;
      return false;
      
    } catch (err) {
      console.error('[Update] Check failed:', err);
      toast({
        title: "You're Up to Date ✓",
        description: `Running version v${APP_VERSION}`,
      });
      setIsChecking(false);
      checkInProgress.current = false;
      return false;
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const setupUpdateListener = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        
        setRegistration(reg);
        
        // Check for waiting worker immediately (update available)
        if (reg.waiting) {
          setUpdateAvailable(true);
          return;
        }

        // Force check for updates on every app load/revisit
        try {
          await reg.update();
          // Check again after update call
          if (reg.waiting) {
            setUpdateAvailable(true);
            return;
          }
        } catch (e) {
          console.log('Update check on load:', e);
        }

        // Listen for new updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (err) {
        console.log('Service worker setup:', err);
      }
    };

    // Check immediately on mount
    setupUpdateListener();
    
    // Also check on visibility change (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setupUpdateListener();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for controller change (after update)
    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      toast({
        title: 'Not Supported',
        description: 'Service workers are not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    const waitForWaitingWorker = (reg: ServiceWorkerRegistration, timeoutMs = 12000) => {
      return new Promise<ServiceWorker | null>((resolve) => {
        if (reg.waiting) {
          resolve(reg.waiting);
          return;
        }

        let resolved = false;
        let timeoutId: number | undefined;

        const cleanup = () => {
          if (timeoutId) window.clearTimeout(timeoutId);
          reg.removeEventListener('updatefound', onUpdateFound);
        };

        const finish = (worker: ServiceWorker | null) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          resolve(worker);
        };

        const onInstalled = () => {
          // If install completes, the worker should be in reg.waiting
          finish(reg.waiting ?? null);
        };

        const attachInstalling = (worker: ServiceWorker | null) => {
          if (!worker) return;
          const onStateChange = () => {
            if (worker.state === 'installed') {
              worker.removeEventListener('statechange', onStateChange);
              onInstalled();
            } else if (worker.state === 'redundant') {
              worker.removeEventListener('statechange', onStateChange);
              finish(null);
            }
          };
          worker.addEventListener('statechange', onStateChange);
          // immediate check
          if (worker.state === 'installed') {
            worker.removeEventListener('statechange', onStateChange);
            onInstalled();
          }
        };

        const onUpdateFound = () => {
          attachInstalling(reg.installing ?? null);
        };

        reg.addEventListener('updatefound', onUpdateFound);
        attachInstalling(reg.installing ?? null);

        timeoutId = window.setTimeout(() => finish(reg.waiting ?? null), timeoutMs);
      });
    };

    try {
      const reg = registration ?? (await navigator.serviceWorker.getRegistration());

      if (!reg) {
        throw new Error('Service worker is not registered yet.');
      }

      // If the update is not downloaded yet, trigger download first.
      if (!reg.waiting) {
        try {
          await reg.update();
        } catch (e) {
          console.log('[Update] reg.update() failed:', e);
        }

        const waitingWorker = await waitForWaitingWorker(reg);
        if (!waitingWorker) {
          throw new Error('Update is not ready yet. Please try again in a moment.');
        }
      }

      if (!reg.waiting) {
        throw new Error('Update is not ready yet. Please try again.');
      }

      toast({
        title: '🚀 Updating...',
        description: 'Installing new version, please wait.',
      });

      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (e: any) {
      console.log('[Update] Apply update failed:', e);
      setIsUpdating(false);
      toast({
        title: 'Update failed',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [registration]);

  return { updateAvailable, applyUpdate, checkForUpdate, isChecking, isUpdating };
};