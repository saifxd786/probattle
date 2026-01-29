import { useEffect, useState, useCallback } from 'react';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check for updates immediately on mount
  const checkForUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      return;
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
        return;
      }

      // Check installing worker
      if (reg.installing) {
        reg.installing.addEventListener('statechange', function() {
          if (this.state === 'installed' && navigator.serviceWorker.controller) {
            setRegistration(reg);
            setUpdateAvailable(true);
          }
        });
        return;
      }
    } catch (err) {
      console.log('Update check failed:', err);
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
    checkForUpdate();

    // Listen for controller change (after update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, [checkForUpdate]);

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      setIsUpdating(true);
      
      // Give a slight delay to show the progress animation
      setTimeout(() => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }, 1500);
    }
  }, [registration]);

  return { updateAvailable, applyUpdate, checkForUpdate, isChecking, isUpdating };
};
