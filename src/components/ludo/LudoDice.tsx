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
  compact?: boolean;
}

// Dice dot patterns for each face
const getDotPositions = (value: number): { x: number; y: number }[] => {
  const patterns: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
    3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
    4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    6: [{ x: 25, y: 20 }, { x: 25, y: 50 }, { x: 25, y: 80 }, { x: 75, y: 20 }, { x: 75, y: 50 }, { x: 75, y: 80 }]
  };
  return patterns[value] || [];
};

// 3D Dice Face with realistic dots
const DiceFace = ({ value, className = "" }: { value: number; className?: string }) => {
  const dots = getDotPositions(value);
  
  return (
    <div className={cn("absolute inset-0 rounded-lg flex items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full p-2">
        <defs>
          <radialGradient id="diceDotGradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#8B0000" />
            <stop offset="50%" stopColor="#5C0000" />
            <stop offset="100%" stopColor="#2D0000" />
          </radialGradient>
          <filter id="diceDotShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>
        {dots.map((dot, idx) => (
          <circle
            key={idx}
            cx={dot.x}
            cy={dot.y}
            r="11"
            fill="url(#diceDotGradient)"
            filter="url(#diceDotShadow)"
          />
        ))}
      </svg>
    </div>
  );
};

// 3D Dice Cube Component
const Dice3D = ({ value, isRolling, size = 80 }: { value: number; isRolling: boolean; size?: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [rotationPhase, setRotationPhase] = useState(0);

  useEffect(() => {
    if (isRolling) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        setRotationPhase(prev => (prev + 1) % 4);
      }, 80);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [isRolling, value]);

  const getRotation = () => {
    if (!isRolling) return { rotateX: -15, rotateY: 15, rotateZ: 0 };
    
    const rotations = [
      { rotateX: 360, rotateY: 180, rotateZ: 90 },
      { rotateX: 180, rotateY: 360, rotateZ: 180 },
      { rotateX: 540, rotateY: 270, rotateZ: 270 },
      { rotateX: 720, rotateY: 540, rotateZ: 360 },
    ];
    return rotations[rotationPhase];
  };

  return (
    <div className="relative" style={{ width: size, height: size, perspective: '200px' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={getRotation()}
        transition={isRolling ? { 
          duration: 0.15, 
          ease: 'linear' 
        } : { 
          type: 'spring', 
          stiffness: 200, 
          damping: 20 
        }}
      >
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: 'linear-gradient(145deg, #FFFFFF 0%, #F5F5F5 30%, #E8E8E8 70%, #D0D0D0 100%)',
            boxShadow: `
              inset 0 2px 6px rgba(255,255,255,0.9),
              inset 0 -2px 6px rgba(0,0,0,0.1),
              0 4px 12px rgba(0,0,0,0.3),
              0 2px 4px rgba(0,0,0,0.2)
            `,
            transform: 'translateZ(8px)',
            border: '1px solid rgba(200,200,200,0.5)',
          }}
        >
          <DiceFace value={displayValue} />
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: size * 0.8,
          height: size * 0.2,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
        }}
        animate={{
          scale: isRolling ? [1, 1.2, 0.9, 1.1, 1] : 1,
          opacity: isRolling ? [0.25, 0.4, 0.25, 0.35, 0.25] : 0.25,
        }}
        transition={{ duration: 0.3, repeat: isRolling ? Infinity : 0 }}
      />
    </div>
  );
};

// Dice bounce animation during roll
const BouncingDice = ({ size = 80 }: { size?: number }) => {
  const [currentFace, setCurrentFace] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6) + 1);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      animate={{
        y: [0, -15, 0, -10, 0, -5, 0],
        rotate: [0, 10, -8, 5, -3, 0],
      }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Dice3D value={currentFace} isRolling={true} size={size} />
    </motion.div>
  );
};

const LudoDice = ({ value, isRolling, onRoll, disabled, canRoll, compact = false }: LudoDiceProps) => {
  const [showSixBonus, setShowSixBonus] = useState(false);
  
  // Compact sizes
  const diceSize = compact ? 56 : 80;
  const platformPadding = compact ? 'p-3' : 'p-5';

  useEffect(() => {
    if (!isRolling && value === 6) {
      const timer = setTimeout(() => {
        setShowSixBonus(true);
        soundManager.playDiceResult(value);
        hapticManager.diceResult(value);
      }, 100);
      return () => clearTimeout(timer);
    }
    setShowSixBonus(false);
  }, [isRolling, value]);

  useEffect(() => {
    if (!isRolling && value && value !== 6) {
      soundManager.playDiceResult(value);
      hapticManager.diceResult(value);
    }
  }, [isRolling, value]);

  const handleRoll = () => {
    if (disabled || !canRoll || isRolling) return;
    soundManager.playClick();
    soundManager.playDiceRoll();
    hapticManager.diceRoll();
    onRoll();
  };

  return (
    <div className={cn("flex items-center justify-center gap-4", compact && "gap-3")}>
      {/* Dice Platform */}
      <motion.div
        className={cn(
          'relative rounded-2xl',
          platformPadding,
          canRoll && !disabled && !isRolling && 'cursor-pointer'
        )}
        style={{
          background: 'linear-gradient(180deg, #3D2817 0%, #2A1B0F 50%, #1F1409 100%)',
          boxShadow: `
            inset 0 2px 3px rgba(255,255,255,0.1),
            inset 0 -2px 3px rgba(0,0,0,0.3),
            0 3px 8px rgba(0,0,0,0.4)
          `,
          border: '2px solid #5C3D2E',
        }}
        onClick={handleRoll}
        whileHover={canRoll && !disabled && !isRolling ? { scale: 1.02 } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.98 } : {}}
      >
        {/* Glowing ring when can roll */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: '0 0 15px rgba(255,200,50,0.4), inset 0 0 10px rgba(255,200,50,0.1)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="rolling"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <BouncingDice size={diceSize} />
            </motion.div>
          ) : (
            <motion.div
              key={`result-${value}`}
              initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Dice3D value={value} isRolling={false} size={diceSize} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Six bonus badge */}
        <AnimatePresence>
          {showSixBonus && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                boxShadow: '0 2px 6px rgba(255,165,0,0.5)',
              }}
            >
              🎉 +1!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Roll Button - Compact */}
      <motion.button
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'relative rounded-xl font-bold overflow-hidden transition-all',
          compact ? 'px-5 py-2.5 text-xs' : 'px-8 py-3 text-sm',
          canRoll && !disabled && !isRolling
            ? 'text-amber-900'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        )}
        style={canRoll && !disabled && !isRolling ? {
          background: 'linear-gradient(180deg, #FFE066 0%, #FFD700 30%, #FFA500 70%, #E6940B 100%)',
          boxShadow: '0 3px 10px rgba(255,165,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4)',
          border: '1px solid #CC8400',
        } : {}}
        whileHover={canRoll && !disabled && !isRolling ? { scale: 1.03, y: -1 } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.97 } : {}}
      >
        {/* Shine effect */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          {isRolling ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
              >
                🎲
              </motion.span>
              Rolling...
            </>
          ) : canRoll ? (
            <>🎲 Tap to Roll</>
          ) : (
            <>⏳ Wait</>
          )}
        </span>
      </motion.button>
    </div>
  );
};

export default LudoDice;
