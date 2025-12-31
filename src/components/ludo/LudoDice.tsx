import { useState, useEffect } from 'react';
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

// 3D Dice Face Component
const DiceFace3D = ({ value }: { value: number }) => {
  const dotPositions: { [key: number]: { x: number; y: number }[] } = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
    3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
    4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    6: [{ x: 25, y: 25 }, { x: 25, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }, { x: 75, y: 50 }, { x: 75, y: 75 }]
  };

  const dots = dotPositions[value] || [];

  return (
    <div className="relative w-20 h-20" style={{ perspective: '200px' }}>
      <motion.div
        className="w-full h-full rounded-2xl relative"
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f0 50%, #e0e0e0 100%)',
          boxShadow: `
            0 10px 30px rgba(0,0,0,0.3),
            inset 0 2px 10px rgba(255,255,255,0.8),
            inset 0 -2px 10px rgba(0,0,0,0.1)
          `,
          transformStyle: 'preserve-3d',
        }}
        initial={{ rotateX: -20, rotateY: 20 }}
        animate={{ rotateX: -10, rotateY: 10 }}
      >
        {/* Dots */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="dotGrad" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#4a0000" />
              <stop offset="100%" stopColor="#1a0000" />
            </radialGradient>
            <filter id="dotShadow">
              <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.3" />
            </filter>
          </defs>
          {dots.map((dot, idx) => (
            <motion.circle
              key={idx}
              cx={dot.x}
              cy={dot.y}
              r="10"
              fill="url(#dotGrad)"
              filter="url(#dotShadow)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 500 }}
            />
          ))}
        </svg>
      </motion.div>
    </div>
  );
};

// Rolling Dice Animation
const RollingDice = () => {
  const [face, setFace] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setFace(Math.floor(Math.random() * 6) + 1);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="w-20 h-20 rounded-2xl relative"
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #e0e0e0 100%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}
      animate={{
        rotateX: [0, 360, 720, 1080],
        rotateY: [0, 360, 720, 1080],
        rotateZ: [0, 180, 360, 540],
        scale: [1, 1.1, 1, 1.1, 1],
      }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-red-800">
        {face}
      </div>
    </motion.div>
  );
};

const LudoDice = ({ value, isRolling, onRoll, disabled, canRoll }: LudoDiceProps) => {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!isRolling && value) {
      const timer = setTimeout(() => {
        setShowResult(true);
        soundManager.playDiceResult(value);
        hapticManager.diceResult(value);
      }, 100);
      return () => clearTimeout(timer);
    }
    setShowResult(false);
  }, [isRolling, value]);

  const handleRoll = () => {
    if (disabled || !canRoll || isRolling) return;
    soundManager.playClick();
    soundManager.playDiceRoll();
    hapticManager.diceRoll();
    onRoll();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Dice Platform */}
      <motion.div
        className={cn(
          'relative p-6 rounded-3xl',
          canRoll && !disabled && !isRolling && 'cursor-pointer'
        )}
        style={{
          background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
          boxShadow: canRoll && !disabled 
            ? '0 0 40px rgba(255,200,0,0.3), inset 0 2px 10px rgba(255,255,255,0.1)'
            : 'inset 0 2px 10px rgba(255,255,255,0.05)',
        }}
        onClick={handleRoll}
        whileHover={canRoll && !disabled && !isRolling ? { scale: 1.05 } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.95 } : {}}
      >
        {/* Glow effect when can roll */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(255,200,0,0.2) 0%, transparent 70%)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="rolling"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <RollingDice />
            </motion.div>
          ) : (
            <motion.div
              key={`result-${value}`}
              initial={{ opacity: 0, scale: 0.5, rotateX: -180 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <DiceFace3D value={value} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Six bonus indicator */}
        <AnimatePresence>
          {value === 6 && !isRolling && showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
            >
              🎉 +1 Turn!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Roll Button */}
      <motion.button
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'relative px-10 py-4 rounded-2xl font-bold text-lg overflow-hidden transition-all',
          canRoll && !disabled && !isRolling
            ? 'text-white shadow-xl'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        )}
        style={canRoll && !disabled && !isRolling ? {
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
          boxShadow: '0 8px 25px rgba(255,165,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
        } : {}}
        whileHover={canRoll && !disabled && !isRolling ? { scale: 1.05, y: -2 } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.95 } : {}}
      >
        {/* Shine effect */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          {isRolling ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
              >
                🎲
              </motion.span>
              Rolling...
            </>
          ) : canRoll ? (
            <>🎲 Tap to Roll</>
          ) : (
            <>⏳ Wait...</>
          )}
        </span>
      </motion.button>
    </div>
  );
};

export default LudoDice;
