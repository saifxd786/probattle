import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { APP_VERSION } from '@/constants/appVersion';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check for updates - OPTIMIZED: Fast check with timeout
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
      // Get registration with 2-second timeout
      const regPromise = navigator.serviceWorker.getRegistration();
      const timeoutPromise = new Promise<undefined>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 2000)
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

      // Check for waiting worker immediately
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

      // Force update check with 3-second timeout
      const updatePromise = reg.update();
      const updateTimeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
      
      await Promise.race([updatePromise, updateTimeout]);
      
      // Check again for waiting worker after update
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

      // Check installing worker with quick timeout
      if (reg.installing) {
        const installCheck = new Promise<boolean>((resolve) => {
          const worker = reg.installing!;
          const onStateChange = () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.removeEventListener('statechange', onStateChange);
              resolve(true);
            }
          };
          worker.addEventListener('statechange', onStateChange);
          setTimeout(() => {
            worker.removeEventListener('statechange', onStateChange);
            resolve(false);
          }, 2000);
        });

        const hasUpdate = await installCheck;
        if (hasUpdate) {
          setRegistration(reg);
          setUpdateAvailable(true);
          toast({
            title: "Update Available! 🎉",
            description: "A new version is ready. Tap 'Apply Update' to install.",
          });
          setIsChecking(false);
          return true;
        }
      }

      // No update available
      toast({
        title: "You're Up to Date ✓",
        description: `Running version v${APP_VERSION}`,
      });
      setIsChecking(false);
      return false;
    } catch (err) {
      console.log('Update check:', err);
      // Even on error/timeout, show up to date message
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
        
        // Check for waiting worker immediately (update available)
        if (reg.waiting) {
          setRegistration(reg);
          setUpdateAvailable(true);
          return;
        }

        // Listen for new updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setRegistration(reg);
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

    // Listen for controller change (after update)
    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      setIsUpdating(true);
      
      toast({
        title: "Updating...",
        description: "Installing new version, please wait.",
      });
      
      // Immediately trigger the update
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  return { updateAvailable, applyUpdate, checkForUpdate, isChecking, isUpdating };
};
