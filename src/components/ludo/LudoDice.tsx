import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

interface LudoDiceProps {
  value: number;
  isRolling: boolean;
  onRoll: () => void;
  disabled?: boolean;
  canRoll: boolean;
}

const DiceFace = ({ value, animate = false }: { value: number; animate?: boolean }) => {
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
    <motion.div 
      className="relative w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-xl shadow-lg border-2 border-gray-200"
      initial={animate ? { rotateX: 0, rotateY: 0 } : false}
      animate={animate ? { 
        boxShadow: ['0 4px 6px rgba(0,0,0,0.1)', '0 8px 20px rgba(0,0,0,0.2)', '0 4px 6px rgba(0,0,0,0.1)']
      } : {}}
      transition={{ duration: 0.3 }}
    >
      {positions.map((pos, idx) => (
        <motion.div
          key={idx}
          className={cn(
            'absolute w-3 h-3 bg-gray-900 rounded-full shadow-inner',
            getDotStyle(pos)
          )}
          initial={animate ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ delay: idx * 0.05, type: 'spring', stiffness: 500, damping: 15 }}
        />
      ))}
    </motion.div>
  );
};

const RollingDice = () => {
  const faces = [1, 2, 3, 4, 5, 6];
  const [currentFace, setCurrentFace] = useState(1);
  
  // Rapidly change faces during roll
  useState(() => {
    const interval = setInterval(() => {
      setCurrentFace(faces[Math.floor(Math.random() * faces.length)]);
    }, 80);
    return () => clearInterval(interval);
  });

  return (
    <motion.div
      className="relative w-16 h-16"
      animate={{
        rotateX: [0, 360, 720],
        rotateY: [0, 360, 720],
        scale: [1, 1.2, 1.1, 1],
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="w-16 h-16 bg-gradient-to-br from-white to-gray-200 rounded-xl shadow-2xl animate-pulse" />
    </motion.div>
  );
};

const LudoDice = ({ value, isRolling, onRoll, disabled, canRoll }: LudoDiceProps) => {
  const [showResult, setShowResult] = useState(false);
  const lastValueRef = useRef(value);

  const handleRoll = () => {
    if (disabled || !canRoll) return;
    soundManager.playClick();
    soundManager.playDiceRoll();
    hapticManager.diceRoll();
    setShowResult(false);
    onRoll();
  };

  // Show result animation when rolling stops
  if (!isRolling && lastValueRef.current !== value) {
    lastValueRef.current = value;
    setTimeout(() => {
      setShowResult(true);
      soundManager.playDiceResult(value);
      hapticManager.diceResult(value);
    }, 100);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dice Container with glow effect */}
      <motion.div
        className={cn(
          'relative p-4 rounded-2xl',
          canRoll && !disabled && 'bg-gradient-to-br from-primary/10 to-primary/5'
        )}
        animate={canRoll && !isRolling ? {
          boxShadow: [
            '0 0 0 0 rgba(0, 200, 255, 0)',
            '0 0 20px 5px rgba(0, 200, 255, 0.3)',
            '0 0 0 0 rgba(0, 200, 255, 0)',
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="rolling"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <RollingDice />
            </motion.div>
          ) : (
            <motion.div
              key={`result-${value}`}
              initial={{ opacity: 0, scale: 0.5, rotateX: -90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <DiceFace value={value} animate={showResult} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Six indicator */}
        {value === 6 && !isRolling && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full"
          >
            +1 Turn!
          </motion.div>
        )}
      </motion.div>

      {/* Roll Button */}
      <motion.button
        whileHover={canRoll && !disabled ? { scale: 1.05 } : {}}
        whileTap={canRoll && !disabled ? { scale: 0.95 } : {}}
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'relative px-8 py-3 rounded-xl font-semibold text-sm transition-all overflow-hidden',
          canRoll && !disabled && !isRolling
            ? 'bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground hover:opacity-90 shadow-lg'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {/* Animated background for active state */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span className="relative z-10">
          {isRolling ? 'Rolling...' : canRoll ? '🎲 Roll Dice' : 'Wait...'}
        </span>
      </motion.button>
    </div>
  );
};

export default LudoDice;