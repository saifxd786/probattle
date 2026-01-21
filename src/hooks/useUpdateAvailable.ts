import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      toast.info('Service worker not supported');
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
        toast.success('New update available!', {
          description: 'Click "Apply Update Now" to update.',
        });
        return;
      }

      // Check installing worker
      if (reg.installing) {
        toast.info('Update downloading...', {
          description: 'Please wait while the update downloads.',
        });
        
        reg.installing.addEventListener('statechange', function() {
          if (this.state === 'installed' && navigator.serviceWorker.controller) {
            setRegistration(reg);
            setUpdateAvailable(true);
            toast.success('Update ready!', {
              description: 'Click "Apply Update Now" to update.',
            });
          }
        });
        return;
      }

      toast.info('App is up to date!');
    } catch (err) {
      console.log('Update check failed:', err);
      toast.error('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const setupUpdateListener = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        
        // Check for waiting worker (update available)
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

    setupUpdateListener();

    // Listen for controller change (after update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  const applyUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  };

  return { updateAvailable, applyUpdate, checkForUpdate, isChecking };
};
