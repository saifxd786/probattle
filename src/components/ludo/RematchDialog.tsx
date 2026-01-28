import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Clock, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface RematchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  entryAmount: number;
  opponentName: string;
  isRequester: boolean;
  rematchStatus: 'idle' | 'pending' | 'accepted' | 'declined' | 'timeout';
  timeRemaining?: number;
}

const RematchDialog = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  entryAmount,
  opponentName,
  isRequester,
  rematchStatus,
  timeRemaining = 30
}: RematchDialogProps) => {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    if (isOpen && rematchStatus === 'pending') {
      setCountdown(timeRemaining);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, rematchStatus, timeRemaining]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RotateCcw className="w-5 h-5 text-primary" />
            Rematch
          </DialogTitle>
          <DialogDescription>
            Same entry amount, same opponent - one tap start!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Match details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entry Amount</span>
              <span className="font-bold text-primary">₹{entryAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Opponent</span>
              <span className="font-medium">{opponentName}</span>
            </div>
          </div>

          {/* Status display */}
          <AnimatePresence mode="wait">
            {rematchStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-4"
              >
                <p className="text-muted-foreground text-sm">
                  Send a rematch request to play again!
                </p>
              </motion.div>
            )}

            {rematchStatus === 'pending' && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-4 space-y-3"
              >
                {isRequester ? (
                  <>
                    <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
                    <p className="text-muted-foreground text-sm">
                      Waiting for {opponentName} to accept...
                    </p>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-lg font-semibold text-primary"
                    >
                      {opponentName} wants a rematch!
                    </motion.div>
                    <p className="text-muted-foreground text-sm">
                      Accept to play again with same settings
                    </p>
                  </>
                )}

                {/* Countdown */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expires in {countdown}s</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: timeRemaining, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}

            {rematchStatus === 'accepted' && (
              <motion.div
                key="accepted"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3"
                >
                  <Check className="w-8 h-8 text-green-500" />
                </motion.div>
                <p className="font-semibold text-green-500">Rematch Accepted!</p>
                <p className="text-sm text-muted-foreground mt-1">Starting new game...</p>
              </motion.div>
            )}

            {rematchStatus === 'declined' && (
              <motion.div
                key="declined"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <p className="font-semibold text-red-500">Rematch Declined</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {opponentName} declined the rematch
                </p>
              </motion.div>
            )}

            {rematchStatus === 'timeout' && (
              <motion.div
                key="timeout"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="font-semibold text-yellow-500">Request Expired</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No response received in time
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {rematchStatus === 'idle' && (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={onAccept} className="flex-1 bg-gradient-to-r from-primary to-cyan-500">
                <RotateCcw className="w-4 h-4 mr-2" />
                Request Rematch
              </Button>
            </>
          )}

          {rematchStatus === 'pending' && !isRequester && (
            <>
              <Button variant="destructive" onClick={onDecline} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Decline
              </Button>
              <Button onClick={onAccept} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500">
                <Check className="w-4 h-4 mr-2" />
                Accept
              </Button>
            </>
          )}

          {rematchStatus === 'pending' && isRequester && (
            <Button variant="outline" onClick={onDecline} className="w-full">
              Cancel Request
            </Button>
          )}

          {(rematchStatus === 'declined' || rematchStatus === 'timeout') && (
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RematchDialog;
