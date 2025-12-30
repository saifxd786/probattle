import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LudoDiceProps {
  value: number;
  isRolling: boolean;
  onRoll: () => void;
  disabled?: boolean;
  canRoll: boolean;
}

const DiceFace = ({ value }: { value: number }) => {
  const dotPositions: { [key: number]: string[] } = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  const positions = dotPositions[value] || [];

  const getDotStyle = (position: string) => {
    const styles: { [key: string]: string } = {
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      'top-left': 'top-2 left-2',
      'top-right': 'top-2 right-2',
      'bottom-left': 'bottom-2 left-2',
      'bottom-right': 'bottom-2 right-2',
      'middle-left': 'top-1/2 left-2 -translate-y-1/2',
      'middle-right': 'top-1/2 right-2 -translate-y-1/2'
    };
    return styles[position];
  };

  return (
    <div className="relative w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-gray-200">
      {positions.map((pos, idx) => (
        <div
          key={idx}
          className={cn(
            'absolute w-3 h-3 bg-gray-900 rounded-full',
            getDotStyle(pos)
          )}
        />
      ))}
    </div>
  );
};

const LudoDice = ({ value, isRolling, onRoll, disabled, canRoll }: LudoDiceProps) => {
  const [showRollAnimation, setShowRollAnimation] = useState(false);

  const handleRoll = () => {
    if (disabled || !canRoll) return;
    setShowRollAnimation(true);
    onRoll();
    setTimeout(() => setShowRollAnimation(false), 800);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={isRolling || showRollAnimation ? {
          rotateX: [0, 360, 720, 1080],
          rotateY: [0, 360, 720, 1080],
          scale: [1, 1.2, 1]
        } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="perspective-1000"
      >
        <AnimatePresence mode="wait">
          {!isRolling && (
            <motion.div
              key={value}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DiceFace value={value} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {isRolling && (
          <div className="w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-xl shadow-lg animate-spin" />
        )}
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'px-6 py-2 rounded-lg font-semibold text-sm transition-all',
          canRoll && !disabled && !isRolling
            ? 'bg-primary text-primary-foreground hover:opacity-90 neon-glow'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isRolling ? 'Rolling...' : canRoll ? 'Roll Dice' : 'Wait...'}
      </motion.button>
    </div>
  );
};

export default LudoDice;