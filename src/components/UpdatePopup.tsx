import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Sparkles, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

interface UpdatePopupProps {
  isOpen: boolean;
  onUpdate: () => void;
  isUpdating?: boolean;
}

const UpdatePopup = ({ isOpen, onUpdate, isUpdating }: UpdatePopupProps) => {
  const [progress, setProgress] = useState(0);

  // Simulate download progress when updating
  useEffect(() => {
    if (isUpdating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isUpdating]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-sm bg-gradient-to-br from-background via-background to-primary/5 border-primary/20 [&>button]:hidden">
        <AlertDialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1, rotate: isUpdating ? 360 : 0 }}
              transition={{ 
                scale: { duration: 0.3 },
                rotate: { duration: 1, repeat: isUpdating ? Infinity : 0, ease: 'linear' }
              }}
              className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"
            >
              {isUpdating ? (
                <Download className="w-8 h-8 text-primary" />
              ) : (
                <Sparkles className="w-8 h-8 text-primary" />
              )}
            </motion.div>
          </div>
          
          <AlertDialogTitle className="text-xl font-bold text-center">
            {isUpdating ? 'Downloading Update...' : 'Update Required!'}
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-center text-muted-foreground">
            {isUpdating 
              ? 'Please wait while we install the latest version.'
              : 'A new version of ProBattle is available. Update now to continue using the app.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {/* Progress Bar (only while updating to avoid looking "stuck" at 0%) */}
          {isUpdating && (
            <div className="space-y-2">
              <Progress 
                value={progress}
                className="h-3 bg-muted"
              />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% Complete
              </p>
            </div>
          )}

          {!isUpdating && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-xs text-muted-foreground text-center">
                Tap <span className="font-medium text-foreground">Update Now</span> to download & install the latest version.
              </p>
            </div>
          )}

          {/* Warning Section */}
          {!isUpdating && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">
                  You must update to continue using ProBattle
                </p>
              </div>
            </div>
          )}

          {/* What's New Section */}
          {!isUpdating && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground text-center">
                ✨ Bug fixes & performance improvements
              </p>
            </div>
          )}
        </div>

        {!isUpdating && (
          <Button 
            onClick={onUpdate} 
            className="w-full bg-gradient-to-r from-primary to-primary/80 font-bold"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Now
          </Button>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpdatePopup;