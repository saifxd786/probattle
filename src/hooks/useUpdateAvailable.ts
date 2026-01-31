import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { APP_VERSION } from '@/constants/appVersion';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check for updates - returns true if update found
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
      const reg = await navigator.serviceWorker.ready;
      
      // Force update check
      await reg.update();
      
      // Check for waiting worker (update available)
      if (reg.waiting) {
        setRegistration(reg);
        setUpdateAvailable(true);
        toast({
          title: "Update Available! 🎉",
          description: "A new version is ready. Tap 'Apply Update' to install.",
        });
        return true;
      }

      // Check installing worker
      if (reg.installing) {
        return new Promise((resolve) => {
          reg.installing!.addEventListener('statechange', function() {
            if (this.state === 'installed' && navigator.serviceWorker.controller) {
              setRegistration(reg);
              setUpdateAvailable(true);
              toast({
                title: "Update Available! 🎉",
                description: "A new version is ready. Tap 'Apply Update' to install.",
              });
              resolve(true);
            }
          });
          // Timeout after 5 seconds
          setTimeout(() => resolve(false), 5000);
        });
      }

      // No update available
      toast({
        title: "You're Up to Date ✓",
        description: `Running the latest version (v${APP_VERSION})`,
      });
      return false;
    } catch (err) {
      console.log('Update check failed:', err);
      toast({
        title: "Check Failed",
        description: "Could not check for updates. Try again later.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const setupUpdateListener = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        
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
        console.log('Service worker not ready:', err);
      }
    };

    // Check immediately on mount
    setupUpdateListener();

    // Listen for controller change (after update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
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
