import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinesGridProps {
  minePositions: number[];
  revealedPositions: number[];
  pendingPositions?: number[];
  isGameOver: boolean;
  onTileClick: (position: number) => void;
  disabled: boolean;
}

const MinesGrid = ({ 
  minePositions, 
  revealedPositions, 
  pendingPositions = [],
  isGameOver, 
  onTileClick,
  disabled 
}: MinesGridProps) => {
  const getTileState = (position: number) => {
    // Confirmed revealed positions
    if (revealedPositions.includes(position)) {
      return minePositions.includes(position) ? 'mine' : 'gem';
    }
    // Pending positions (optimistic UI) - show as gem until confirmed
    if (pendingPositions.includes(position)) {
      return 'pending';
    }
    if (isGameOver && minePositions.includes(position)) {
      return 'mine-revealed';
    }
    return 'hidden';
  };

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-card/50 rounded-2xl border border-border">
      {Array.from({ length: 25 }).map((_, index) => {
        const state = getTileState(index);
        const isPending = state === 'pending';
        const isRevealed = state === 'gem' || state === 'mine' || state === 'mine-revealed';
        const isMine = state === 'mine' || state === 'mine-revealed';
        const isGem = state === 'gem';
        const isClickable = state === 'hidden' && !disabled;
        
        return (
          <motion.button
            key={index}
            onClick={() => isClickable && onTileClick(index)}
            disabled={disabled || isRevealed || isPending}
            className={cn(
              'aspect-square rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200',
              'border-2 relative overflow-hidden',
              isClickable && 'hover:scale-105 hover:border-primary/50 cursor-pointer',
              state === 'hidden' && 'bg-gradient-to-br from-secondary to-secondary/80 border-border',
              isPending && 'bg-gradient-to-br from-secondary to-secondary/80 border-primary/30',
              isGem && 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-emerald-500/50',
              isMine && 'bg-gradient-to-br from-red-500/20 to-red-600/30 border-red-500/50',
              (disabled && state === 'hidden') && 'opacity-50 cursor-not-allowed',
              isPending && 'cursor-wait'
            )}
            whileTap={isClickable ? { scale: 0.95 } : {}}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <AnimatePresence mode="sync">
              {isRevealed ? (
                <motion.div
                  key={`revealed-${index}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    duration: 0.1,
                    ease: "easeOut"
                  }}
                >
                  {isMine ? (
                    <Bomb className="w-8 h-8 text-red-500" />
                  ) : (
                    <Gem className="w-8 h-8 text-emerald-400" />
                  )}
                </motion.div>
              ) : isPending ? (
                <motion.div
                  key={`pending-${index}`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1, 0.8] }}
                  transition={{ 
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-primary/50" />
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  className="w-full h-full flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                >
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
};

export default MinesGrid;
