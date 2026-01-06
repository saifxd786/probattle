import { useEffect, useState } from 'react';

export const useUpdateAvailable = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdates = async () => {
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

    checkForUpdates();

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

  return { updateAvailable, applyUpdate };
};
