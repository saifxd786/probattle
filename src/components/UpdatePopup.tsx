import { motion } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UpdatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isChecking?: boolean;
}

const UpdatePopup = ({ isOpen, onClose, onUpdate, isChecking }: UpdatePopupProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-3">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: isChecking ? 360 : 0 }}
              transition={{ duration: 1, repeat: isChecking ? Infinity : 0, ease: 'linear' }}
              className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"
            >
              <Sparkles className="w-6 h-6 text-primary" />
            </motion.div>
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-bold text-foreground">
              New Update Available!
            </h3>
            <p className="text-sm text-muted-foreground">
              A new version of ProBattle is available. Update now for the best experience.
            </p>
          </motion.div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={onClose} 
            className="flex-1"
          >
            Later
          </Button>
          <Button 
            onClick={onUpdate} 
            className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            disabled={isChecking}
          >
            {isChecking ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Update Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdatePopup;