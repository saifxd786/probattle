import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Gem, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface MinesGridProps {
  minePositions: number[];
  revealedPositions: number[];
  isGameOver: boolean;
  onTileClick: (position: number) => void;
  disabled: boolean;
}

const MinesGrid = ({ 
  minePositions, 
  revealedPositions, 
  isGameOver, 
  onTileClick,
  disabled 
}: MinesGridProps) => {
  const [pendingTile, setPendingTile] = useState<number | null>(null);

  const getTileState = (position: number) => {
    if (revealedPositions.includes(position)) {
      return minePositions.includes(position) ? 'mine' : 'gem';
    }
    if (isGameOver && minePositions.includes(position)) {
      return 'mine-revealed';
    }
    return 'hidden';
  };

  const handleTileClick = async (index: number) => {
    if (disabled || pendingTile !== null) return;
    
    // Show loading state immediately (optimistic UI)
    setPendingTile(index);
    
    // Call the actual reveal function
    await onTileClick(index);
    
    // Clear pending state after a small delay to ensure smooth animation
    setTimeout(() => {
      setPendingTile(null);
    }, 100);
  };

  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-card/50 rounded-2xl border border-border">
      {Array.from({ length: 25 }).map((_, index) => {
        const state = getTileState(index);
        const isRevealed = state !== 'hidden';
        const isMine = state === 'mine' || state === 'mine-revealed';
        const isGem = state === 'gem';
        const isPending = pendingTile === index;
        
        return (
          <motion.button
            key={index}
            onClick={() => !disabled && !isRevealed && !isPending && handleTileClick(index)}
            disabled={disabled || isRevealed || isPending}
            className={cn(
              'aspect-square rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-150',
              'border-2 relative overflow-hidden',
              !isRevealed && !disabled && !isPending && 'hover:scale-105 hover:border-primary/50 cursor-pointer',
              !isRevealed && !isPending && 'bg-gradient-to-br from-secondary to-secondary/80 border-border',
              isPending && 'bg-gradient-to-br from-primary/20 to-primary/30 border-primary/50 scale-95',
              isGem && 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-emerald-500/50',
              isMine && 'bg-gradient-to-br from-red-500/20 to-red-600/30 border-red-500/50',
              disabled && !isRevealed && !isPending && 'opacity-50 cursor-not-allowed'
            )}
            whileTap={!disabled && !isRevealed && !isPending ? { scale: 0.92 } : {}}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: isPending ? 0.95 : 1, 
              opacity: 1 
            }}
            transition={{ 
              delay: index * 0.015,
              duration: 0.15
            }}
          >
            <AnimatePresence mode="wait">
              {isPending ? (
                <motion.div
                  key="pending"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </motion.div>
              ) : isRevealed ? (
                <motion.div
                  key={state}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 400, 
                    damping: 25,
                    duration: 0.2
                  }}
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
