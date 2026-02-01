import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { APP_VERSION } from '@/constants/appVersion';

interface UpdateCheckPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isChecking: boolean;
  updateAvailable: boolean;
  onApplyUpdate: () => void;
}

const UpdateCheckPopup = ({
  isOpen,
  onClose,
  isChecking,
  updateAvailable,
  onApplyUpdate,
}: UpdateCheckPopupProps) => {
  const [status, setStatus] = useState<'checking' | 'up-to-date' | 'update-available'>('checking');

  useEffect(() => {
    if (isOpen) {
      if (isChecking) {
        setStatus('checking');
      } else if (updateAvailable) {
        setStatus('update-available');
      } else {
        setStatus('up-to-date');
      }
    }
  }, [isOpen, isChecking, updateAvailable]);

  // Auto-close after showing "up-to-date" for 2.5 seconds
  useEffect(() => {
    if (status === 'up-to-date') {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-xs bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-7 w-7"
          onClick={onClose}
          disabled={isChecking}
        >
          <X className="w-4 h-4" />
        </Button>

        <AlertDialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AnimatePresence mode="wait">
              {status === 'checking' && (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 360 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
                  className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"
                >
                  <RefreshCw className="w-8 h-8 text-primary" />
                </motion.div>
              )}

              {status === 'up-to-date' && (
                <motion.div
                  key="up-to-date"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="p-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10"
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
              )}

              {status === 'update-available' && (
                <motion.div
                  key="update-available"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: [1, 1.1, 1] }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ scale: { duration: 0.5, repeat: Infinity, repeatDelay: 1 } }}
                  className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AlertDialogTitle className="text-lg font-bold text-center">
            {status === 'checking' && 'Checking for Updates...'}
            {status === 'up-to-date' && 'You\'re Up to Date! ✓'}
            {status === 'update-available' && 'Update Available! 🎉'}
          </AlertDialogTitle>

          <AlertDialogDescription className="text-center text-muted-foreground">
            {status === 'checking' && 'Please wait while we check for the latest version.'}
            {status === 'up-to-date' && (
              <>Running the latest version <span className="font-semibold text-primary">v{APP_VERSION}</span></>
            )}
            {status === 'update-available' && 'A new version is ready to install.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Apply Update Button */}
        {status === 'update-available' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2"
          >
            <Button
              onClick={() => {
                onApplyUpdate();
                onClose();
              }}
              className="w-full bg-gradient-to-r from-primary to-primary/80 font-bold"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Now
            </Button>
          </motion.div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpdateCheckPopup;
