import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) return;

    const handleUpdate = (reg: ServiceWorkerRegistration) => {
      setRegistration(reg);
      setShowPrompt(true);
    };

    // Listen for service worker updates
    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        
        // Check for waiting worker (update available)
        if (reg.waiting) {
          handleUpdate(reg);
          return;
        }

        // Listen for new updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleUpdate(reg);
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

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-6 md:w-[360px]"
        >
          <div className="glass-card p-4 rounded-xl border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-sm">Update Available!</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A new version is ready. Update now for the latest features.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    onClick={handleUpdate}
                    size="sm"
                    className="h-8 px-4 text-xs bg-gradient-to-r from-primary to-cyan-500"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Update Now
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-muted-foreground"
                  >
                    Later
                  </Button>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdatePrompt;
