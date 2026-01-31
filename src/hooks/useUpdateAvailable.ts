import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { APP_VERSION } from '@/constants/appVersion';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // FAST update check - version.json first, then quick SW check
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (isChecking) return false;
    
    setIsChecking(true);
    
    try {
      // STEP 1: Instant version.json check (most reliable)
      let serverVersion: string | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          serverVersion = data.version;
          console.log('[Update] Server:', serverVersion, '| Current:', APP_VERSION);
        }
      } catch (e) {
        console.log('[Update] Version fetch failed:', e);
      }

      // If server version differs, update is available!
      if (serverVersion && serverVersion !== APP_VERSION) {
        // Check for waiting service worker
        let reg: ServiceWorkerRegistration | null = null;
        try {
          reg = await navigator.serviceWorker?.getRegistration();
          if (reg) {
            setRegistration(reg);
            // Quick update trigger
            await Promise.race([
              reg.update(),
              new Promise(r => setTimeout(r, 2000))
            ]);
          }
        } catch {}
        
        setUpdateAvailable(true);
        toast({
          title: "Update Available! 🎉",
          description: `New version ${serverVersion} ready. Tap 'Apply Update' to install.`,
        });
        setIsChecking(false);
        return true;
      }

      // STEP 2: Quick service worker check (fallback)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await Promise.race([
            navigator.serviceWorker.getRegistration(),
            new Promise<undefined>((_, reject) => setTimeout(() => reject('timeout'), 2000))
          ]) as ServiceWorkerRegistration | undefined;

          if (reg) {
            setRegistration(reg);
            
            // Already waiting?
            if (reg.waiting) {
              setUpdateAvailable(true);
              toast({
                title: "Update Available! 🎉",
                description: "A new version is ready. Tap 'Apply Update' to install.",
              });
              setIsChecking(false);
              return true;
            }

            // Quick update check with 3s timeout
            await Promise.race([
              reg.update(),
              new Promise(r => setTimeout(r, 3000))
            ]);

            // Check again after update
            if (reg.waiting) {
              setUpdateAvailable(true);
              toast({
                title: "Update Available! 🎉",
                description: "A new version is ready. Tap 'Apply Update' to install.",
              });
              setIsChecking(false);
              return true;
            }
          }
        } catch (e) {
          console.log('[Update] SW check:', e);
        }
      }

      // No update found
      toast({
        title: "You're Up to Date ✓",
        description: `Running latest version v${APP_VERSION}`,
      });
      setIsChecking(false);
      return false;
      
    } catch (err) {
      console.log('[Update] Error:', err);
      toast({
        title: "You're Up to Date ✓",
        description: `Running version v${APP_VERSION}`,
      });
      setIsChecking(false);
      return false;
    }
  }, [isChecking]);

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