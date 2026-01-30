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
        const isRevealed = state !== 'hidden';
        const isPending = state === 'pending';
        const isMine = state === 'mine' || state === 'mine-revealed';
        const isGem = state === 'gem' || isPending;
        
        return (
          <motion.button
            key={index}
            onClick={() => !disabled && !isRevealed && onTileClick(index)}
            disabled={disabled || isRevealed}
            className={cn(
              'aspect-square rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200',
              'border-2 relative overflow-hidden',
              !isRevealed && !disabled && 'hover:scale-105 hover:border-primary/50 cursor-pointer',
              !isRevealed && 'bg-gradient-to-br from-secondary to-secondary/80 border-border',
              isGem && 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-emerald-500/50',
              isMine && 'bg-gradient-to-br from-red-500/20 to-red-600/30 border-red-500/50',
              disabled && !isRevealed && 'opacity-50 cursor-not-allowed'
            )}
            whileTap={!disabled && !isRevealed ? { scale: 0.95 } : {}}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <AnimatePresence mode="sync">
              {isRevealed ? (
                <motion.div
                  key={`revealed-${index}`}
                  initial={{ scale: 0.85, opacity: 0.9 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 600,
                    damping: 25,
                    mass: 0.5
                  }}
                  style={{ willChange: 'transform, opacity' }}
                >
                  {isMine ? (
                    <Bomb className="w-8 h-8 text-red-500" />
                  ) : (
                    <Gem className="w-8 h-8 text-emerald-400" />
                  )}
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
