import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Clock, Check, X, Loader2, Zap, Trophy, Swords, Sparkles } from 'lucide-react';
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

// Premium shimmer effect component
const ShimmerEffect = () => (
  <motion.div
    className="absolute inset-0 -translate-x-full"
    animate={{ translateX: ['100%', '-100%'] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
  >
    <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
  </motion.div>
);

// Floating particles effect
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-primary/40"
        style={{
          left: `${15 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
        }}
        animate={{
          y: [-10, 10, -10],
          opacity: [0.3, 0.7, 0.3],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 2 + i * 0.3,
          repeat: Infinity,
          delay: i * 0.2,
        }}
      />
    ))}
  </div>
);

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

  const progressPercent = (countdown / timeRemaining) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-card via-card/95 to-background border-primary/20 shadow-[0_0_60px_rgba(var(--primary),0.15)] overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <FloatingParticles />
        
        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center justify-center gap-3 text-xl">
            <motion.div
              className="relative"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <RotateCcw className="w-5 h-5 text-primary-foreground" />
              </div>
            </motion.div>
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent font-bold tracking-wide">
              REMATCH
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground/80">
            Same entry amount, same opponent - one tap start!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 relative z-10">
          {/* Premium Match Details Card */}
          <motion.div 
            className="relative rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
            <div className="absolute inset-[1px] rounded-xl bg-card/80 backdrop-blur-sm" />
            <ShimmerEffect />
            
            <div className="relative p-4 space-y-3">
              {/* Entry Amount */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">Entry Amount</span>
                </div>
                <motion.span 
                  className="font-bold text-lg bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ₹{entryAmount}
                </motion.span>
              </div>
              
              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              
              {/* Opponent */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center">
                    <Swords className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Opponent</span>
                </div>
                <span className="font-semibold text-foreground">{opponentName}</span>
              </div>
            </div>
          </motion.div>

          {/* Status Display */}
          <AnimatePresence mode="wait">
            {rematchStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-6"
              >
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center"
                  animate={{ 
                    boxShadow: ['0 0 20px rgba(var(--primary), 0.2)', '0 0 40px rgba(var(--primary), 0.4)', '0 0 20px rgba(var(--primary), 0.2)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
                <p className="text-muted-foreground text-sm">
                  Ready for another round? Send a rematch request!
                </p>
              </motion.div>
            )}

            {rematchStatus === 'pending' && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center py-4 space-y-4"
              >
                {isRequester ? (
                  <>
                    {/* Waiting Animation */}
                    <div className="relative w-20 h-20 mx-auto">
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary/30"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full border-2 border-primary/50"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Waiting for <span className="text-primary font-semibold">{opponentName}</span> to accept...
                    </p>
                  </>
                ) : (
                  <>
                    {/* Incoming Request Animation */}
                    <motion.div
                      className="relative w-20 h-20 mx-auto"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl" />
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        animate={{ 
                          boxShadow: ['0 0 0 0 rgba(251, 191, 36, 0)', '0 0 0 15px rgba(251, 191, 36, 0.3)', '0 0 0 0 rgba(251, 191, 36, 0)']
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Swords className="w-8 h-8 text-amber-400" />
                      </div>
                    </motion.div>
                    <div>
                      <motion.p
                        className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {opponentName} wants a rematch!
                      </motion.p>
                      <p className="text-muted-foreground text-sm mt-1">
                        Accept to play again with same settings
                      </p>
                    </div>
                  </>
                )}

                {/* Countdown Timer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className={cn(
                      "w-4 h-4",
                      countdown <= 10 ? "text-red-400" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-mono font-bold",
                      countdown <= 10 ? "text-red-400" : "text-muted-foreground"
                    )}>
                      {countdown}s
                    </span>
                  </div>

                  {/* Premium Progress Bar */}
                  <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        countdown <= 10 
                          ? "bg-gradient-to-r from-red-500 to-orange-500" 
                          : "bg-gradient-to-r from-primary to-cyan-500"
                      )}
                      initial={{ width: '100%' }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                  </div>
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
                  className="relative w-20 h-20 mx-auto mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                >
                  {/* Success glow rings */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-green-500/20"
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-green-500/30"
                    animate={{ scale: [1, 1.3], opacity: [0.7, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                </motion.div>
                <motion.p 
                  className="font-bold text-lg bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  Rematch Accepted!
                </motion.p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Starting new game...
                </p>
              </motion.div>
            )}

            {rematchStatus === 'declined' && (
              <motion.div
                key="declined"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="relative w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
                  <X className="w-10 h-10 text-red-400" />
                </div>
                <p className="font-bold text-lg text-red-400">Rematch Declined</p>
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
                <div className="relative w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-400" />
                </div>
                <p className="font-bold text-lg text-amber-400">Request Expired</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No response received in time
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Premium Action Buttons */}
        <div className="flex gap-3 relative z-10">
          {rematchStatus === 'idle' && (
            <>
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="flex-1 border-border/50 hover:border-border hover:bg-muted/30"
              >
                Cancel
              </Button>
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={onAccept} 
                  className="w-full relative overflow-hidden bg-gradient-to-r from-primary via-primary to-cyan-500 hover:opacity-90 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  <ShimmerEffect />
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Request Rematch
                </Button>
              </motion.div>
            </>
          )}

          {rematchStatus === 'pending' && !isRequester && (
            <>
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="destructive" 
                  onClick={onDecline} 
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90"
                >
                  <X className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </motion.div>
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={onAccept} 
                  className="w-full relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                >
                  <ShimmerEffect />
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </Button>
              </motion.div>
            </>
          )}

          {rematchStatus === 'pending' && isRequester && (
            <Button 
              variant="outline" 
              onClick={onDecline} 
              className="w-full border-border/50 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Request
            </Button>
          )}

          {(rematchStatus === 'declined' || rematchStatus === 'timeout') && (
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="w-full border-border/50 hover:border-border hover:bg-muted/30"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RematchDialog;
