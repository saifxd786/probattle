import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { APP_VERSION } from '@/constants/appVersion';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check for updates - FIXED: Wait for download to complete
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      toast({
        title: "Not Supported",
        description: "Service workers are not supported in this browser.",
        variant: "destructive",
      });
      return false;
    }

    setIsChecking(true);
    
    try {
      // Get registration with 3-second timeout
      const regPromise = navigator.serviceWorker.getRegistration();
      const timeoutPromise = new Promise<undefined>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      
      const reg = await Promise.race([regPromise, timeoutPromise]);
      
      if (!reg) {
        toast({
          title: "You're Up to Date ✓",
          description: `Running version v${APP_VERSION}`,
        });
        setIsChecking(false);
        return false;
      }

      // Check for waiting worker immediately (already downloaded)
      if (reg.waiting) {
        setRegistration(reg);
        setUpdateAvailable(true);
        toast({
          title: "Update Available! 🎉",
          description: "A new version is ready. Tap 'Apply Update' to install.",
        });
        setIsChecking(false);
        return true;
      }

      // Show checking toast
      toast({
        title: "🔄 Checking for updates...",
        description: "Please wait while we check for new versions.",
      });

      // Force update check - this triggers download
      await reg.update();
      
      // Check if update is already waiting after update() call
      if (reg.waiting) {
        setRegistration(reg);
        setUpdateAvailable(true);
        toast({
          title: "Update Available! 🎉",
          description: "A new version is ready. Tap 'Apply Update' to install.",
        });
        setIsChecking(false);
        return true;
      }

      // Wait for installing worker to complete (up to 10 seconds)
      const waitForInstall = (): Promise<boolean> => {
        return new Promise((resolve) => {
          // Check if there's an installing worker
          if (reg.installing) {
            const worker = reg.installing;
            
            const onStateChange = () => {
              console.log('[UpdateCheck] Worker state:', worker.state);
              
              if (worker.state === 'installed') {
                worker.removeEventListener('statechange', onStateChange);
                resolve(true);
              } else if (worker.state === 'redundant') {
                worker.removeEventListener('statechange', onStateChange);
                resolve(false);
              }
            };
            
            worker.addEventListener('statechange', onStateChange);
            
            // Also check current state
            if (worker.state === 'installed') {
              worker.removeEventListener('statechange', onStateChange);
              resolve(true);
              return;
            }
            
            // Timeout after 10 seconds
            setTimeout(() => {
              worker.removeEventListener('statechange', onStateChange);
              resolve(false);
            }, 10000);
          } else {
            // No installing worker, wait a bit and check for updatefound
            const onUpdateFound = () => {
              reg.removeEventListener('updatefound', onUpdateFound);
              
              const newWorker = reg.installing;
              if (!newWorker) {
                resolve(false);
                return;
              }
              
              const onStateChange = () => {
                if (newWorker.state === 'installed') {
                  newWorker.removeEventListener('statechange', onStateChange);
                  resolve(true);
                } else if (newWorker.state === 'redundant') {
                  newWorker.removeEventListener('statechange', onStateChange);
                  resolve(false);
                }
              };
              
              newWorker.addEventListener('statechange', onStateChange);
              
              // Timeout
              setTimeout(() => {
                newWorker.removeEventListener('statechange', onStateChange);
                resolve(false);
              }, 10000);
            };
            
            reg.addEventListener('updatefound', onUpdateFound);
            
            // Timeout if no update found
            setTimeout(() => {
              reg.removeEventListener('updatefound', onUpdateFound);
              resolve(false);
            }, 5000);
          }
        });
      };

      const hasUpdate = await waitForInstall();
      
      if (hasUpdate || reg.waiting) {
        setRegistration(reg);
        setUpdateAvailable(true);
        toast({
          title: "Update Available! 🎉",
          description: "A new version is ready. Tap 'Apply Update' to install.",
        });
        setIsChecking(false);
        return true;
      }

      // No update available
      toast({
        title: "You're Up to Date ✓",
        description: `Running latest version v${APP_VERSION}`,
      });
      setIsChecking(false);
      return false;
    } catch (err) {
      console.log('Update check error:', err);
      // On error/timeout, still check for waiting worker
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          setRegistration(reg);
          setUpdateAvailable(true);
          toast({
            title: "Update Available! 🎉",
            description: "A new version is ready. Tap 'Apply Update' to install.",
          });
          setIsChecking(false);
          return true;
        }
      } catch {}
      
      toast({
        title: "You're Up to Date ✓",
        description: `Running version v${APP_VERSION}`,
      });
      setIsChecking(false);
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

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      setIsUpdating(true);
      
      toast({
        title: "🚀 Updating...",
        description: "Installing new version, please wait.",
      });
      
      // Immediately trigger the update
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback: try to get registration again
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setIsUpdating(true);
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          toast({
            title: "No Update Ready",
            description: "Please try checking for updates again.",
            variant: "destructive",
          });
        }
      });
    }
  }, [registration]);

  return { updateAvailable, applyUpdate, checkForUpdate, isChecking, isUpdating };
};