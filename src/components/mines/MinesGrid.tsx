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
    // Pending positions - show as gem IMMEDIATELY (optimistic)
    if (pendingPositions.includes(position)) {
      return 'pending-gem';
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
        const isPendingGem = state === 'pending-gem';
        const isRevealed = state === 'gem' || state === 'mine' || state === 'mine-revealed';
        const isMine = state === 'mine' || state === 'mine-revealed';
        const isGem = state === 'gem' || isPendingGem; // Show gem for pending too
        const isClickable = state === 'hidden' && !disabled;
        
        return (
          <motion.button
            key={index}
            onClick={() => isClickable && onTileClick(index)}
            disabled={disabled || isRevealed || isPendingGem}
            className={cn(
              'aspect-square rounded-xl flex items-center justify-center text-2xl font-bold',
              'border-2 relative overflow-hidden',
              isClickable && 'hover:scale-105 hover:border-primary/50 cursor-pointer active:scale-95',
              state === 'hidden' && 'bg-gradient-to-br from-secondary to-secondary/80 border-border',
              (isGem || isPendingGem) && 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-emerald-500/50',
              isMine && 'bg-gradient-to-br from-red-500/20 to-red-600/30 border-red-500/50',
              (disabled && state === 'hidden') && 'opacity-50 cursor-not-allowed'
            )}
          >
            {(isRevealed || isPendingGem) ? (
              isMine ? (
                <Bomb className="w-8 h-8 text-red-500" />
              ) : (
                <Gem className="w-8 h-8 text-emerald-400" />
              )
            ) : (
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default MinesGrid;
