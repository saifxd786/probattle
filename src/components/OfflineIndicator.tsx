import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        toast({
          title: "Back Online!",
          description: "Your internet connection has been restored.",
          duration: 3000,
        });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, toast]);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>You're offline. Check your internet connection.</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
