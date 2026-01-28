import { useState, useEffect, useRef } from 'react';
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

// Dice dot patterns for each face (1-6)
const getDotPositions = (value: number): { x: number; y: number }[] => {
  const patterns: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 50 }],
    2: [{ x: 28, y: 28 }, { x: 72, y: 72 }],
    3: [{ x: 28, y: 28 }, { x: 50, y: 50 }, { x: 72, y: 72 }],
    4: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
    5: [{ x: 28, y: 28 }, { x: 72, y: 28 }, { x: 50, y: 50 }, { x: 28, y: 72 }, { x: 72, y: 72 }],
    6: [{ x: 28, y: 22 }, { x: 28, y: 50 }, { x: 28, y: 78 }, { x: 72, y: 22 }, { x: 72, y: 50 }, { x: 72, y: 78 }]
  };
  return patterns[value] || [];
};

// Premium 3D Dice Face with realistic dots
const DiceFace = ({ value, faceStyle }: { value: number; faceStyle?: React.CSSProperties }) => {
  const dots = getDotPositions(value);
  
  return (
    <div 
      className="absolute w-full h-full rounded-lg flex items-center justify-center"
      style={{
        background: 'linear-gradient(145deg, #FEFEFE 0%, #F8F8F8 20%, #EFEFEF 50%, #E0E0E0 80%, #D8D8D8 100%)',
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,1),
          inset 0 -2px 4px rgba(0,0,0,0.08),
          inset 2px 0 4px rgba(255,255,255,0.5),
          inset -2px 0 4px rgba(0,0,0,0.05)
        `,
        border: '1px solid rgba(180,180,180,0.3)',
        backfaceVisibility: 'hidden',
        ...faceStyle
      }}
    >
      <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
        <defs>
          <radialGradient id={`dotGrad-${value}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="#C41E3A" />
            <stop offset="40%" stopColor="#8B0000" />
            <stop offset="100%" stopColor="#4A0000" />
          </radialGradient>
          <filter id={`dotShadow-${value}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0.5" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>
        {dots.map((dot, idx) => (
          <circle
            key={idx}
            cx={dot.x}
            cy={dot.y}
            r="10"
            fill={`url(#dotGrad-${value})`}
            filter={`url(#dotShadow-${value})`}
          />
        ))}
      </svg>
    </div>
  );
};

// True 3D Dice Cube with all 6 faces
const Dice3DCube = ({ 
  value, 
  isRolling, 
  size = 72 
}: { 
  value: number; 
  isRolling: boolean; 
  size?: number;
}) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number>();
  const halfSize = size / 2;

  // Map dice value to rotation angles
  const getRotationForValue = (val: number) => {
    const rotations: Record<number, { x: number; y: number; z: number }> = {
      1: { x: 0, y: 0, z: 0 },
      2: { x: 0, y: 90, z: 0 },
      3: { x: -90, y: 0, z: 0 },
      4: { x: 90, y: 0, z: 0 },
      5: { x: 0, y: -90, z: 0 },
      6: { x: 180, y: 0, z: 0 },
    };
    return rotations[val] || { x: 0, y: 0, z: 0 };
  };

  useEffect(() => {
    if (isRolling) {
      let frame = 0;
      const animate = () => {
        frame++;
        // Fast random rotations during roll
        setRotation({
          x: frame * 25 + Math.random() * 30,
          y: frame * 20 + Math.random() * 25,
          z: frame * 15 + Math.random() * 20,
        });
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        
        if (frame < 20) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      // Settle to final value rotation
      const finalRotation = getRotationForValue(value);
      setRotation(finalRotation);
      setDisplayValue(value);
    }
  }, [isRolling, value]);

  const faceTransforms = {
    front: `translateZ(${halfSize}px)`,
    back: `rotateY(180deg) translateZ(${halfSize}px)`,
    right: `rotateY(90deg) translateZ(${halfSize}px)`,
    left: `rotateY(-90deg) translateZ(${halfSize}px)`,
    top: `rotateX(90deg) translateZ(${halfSize}px)`,
    bottom: `rotateX(-90deg) translateZ(${halfSize}px)`,
  };

  // Standard dice: opposite faces sum to 7
  // Front=1, Back=6, Right=2, Left=5, Top=3, Bottom=4

  return (
    <div 
      className="relative"
      style={{ 
        width: size, 
        height: size, 
        perspective: '400px',
        perspectiveOrigin: '50% 50%'
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
        }}
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
          rotateZ: rotation.z,
        }}
        transition={isRolling ? {
          duration: 0.08,
          ease: 'linear'
        } : {
          type: 'spring',
          stiffness: 150,
          damping: 18,
          mass: 1.2,
        }}
      >
        {/* Front face - 1 */}
        <DiceFace value={1} faceStyle={{ transform: faceTransforms.front }} />
        {/* Back face - 6 */}
        <DiceFace value={6} faceStyle={{ transform: faceTransforms.back }} />
        {/* Right face - 2 */}
        <DiceFace value={2} faceStyle={{ transform: faceTransforms.right }} />
        {/* Left face - 5 */}
        <DiceFace value={5} faceStyle={{ transform: faceTransforms.left }} />
        {/* Top face - 3 */}
        <DiceFace value={3} faceStyle={{ transform: faceTransforms.top }} />
        {/* Bottom face - 4 */}
        <DiceFace value={4} faceStyle={{ transform: faceTransforms.bottom }} />
      </motion.div>

      {/* Dynamic shadow */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          bottom: -8,
          width: size * 0.85,
          height: size * 0.2,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)',
        }}
        animate={{
          scale: isRolling ? [1, 0.7, 1.1, 0.8, 1] : 1,
          opacity: isRolling ? [0.35, 0.5, 0.25, 0.45, 0.35] : 0.35,
        }}
        transition={{ 
          duration: 0.25, 
          repeat: isRolling ? Infinity : 0,
          ease: 'easeInOut'
        }}
      />
    </div>
  );
};

// Bouncing animation wrapper
const BouncingDice = ({ value, size = 72 }: { value: number; size?: number }) => {
  return (
    <motion.div
      animate={{
        y: [0, -20, 0, -12, 0, -6, 0, -2, 0],
        rotate: [0, 8, -6, 4, -2, 0],
      }}
      transition={{ 
        duration: 0.7, 
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.15, 0.3, 0.45, 0.6, 0.7, 0.8, 0.9, 1]
      }}
    >
      <Dice3DCube value={value} isRolling={true} size={size} />
    </motion.div>
  );
};

const LudoDice = ({ value, isRolling, onRoll, disabled, canRoll, compact = false }: LudoDiceProps) => {
  const [showSixBonus, setShowSixBonus] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  const diceSize = compact ? 56 : 72;

  useEffect(() => {
    if (!isRolling && value === 6) {
      const timer = setTimeout(() => {
        setShowSixBonus(true);
        setShowResult(true);
        soundManager.playDiceResult(value);
        hapticManager.diceResult(value);
      }, 150);
      return () => clearTimeout(timer);
    }
    setShowSixBonus(false);
    if (!isRolling && value) {
      setShowResult(true);
    }
  }, [isRolling, value]);

  useEffect(() => {
    if (!isRolling && value && value !== 6) {
      const timer = setTimeout(() => {
        soundManager.playDiceResult(value);
        hapticManager.diceResult(value);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isRolling, value]);

  useEffect(() => {
    if (isRolling) {
      setShowResult(false);
    }
  }, [isRolling]);

  const handleRoll = () => {
    if (disabled || !canRoll || isRolling) return;
    soundManager.playClick();
    soundManager.playDiceRoll();
    hapticManager.diceRoll();
    onRoll();
  };

  return (
    <div className={cn("flex items-center justify-center gap-4", compact && "gap-3")}>
      {/* Premium Wooden Dice Platform */}
      <motion.div
        className={cn(
          'relative rounded-2xl',
          compact ? 'p-3' : 'p-4',
          canRoll && !disabled && !isRolling && 'cursor-pointer'
        )}
        style={{
          background: `
            linear-gradient(180deg, 
              #5D4037 0%, 
              #4E342E 15%,
              #3E2723 40%, 
              #2D1F1A 70%,
              #1A1210 100%
            )
          `,
          boxShadow: `
            inset 0 2px 4px rgba(139,90,43,0.4),
            inset 0 -3px 6px rgba(0,0,0,0.5),
            inset 2px 0 4px rgba(139,90,43,0.2),
            inset -2px 0 4px rgba(0,0,0,0.3),
            0 6px 20px rgba(0,0,0,0.5),
            0 2px 8px rgba(0,0,0,0.3)
          `,
          border: '3px solid #6D4C41',
          borderTopColor: '#8D6E63',
          borderBottomColor: '#3E2723',
        }}
        onClick={handleRoll}
        whileHover={canRoll && !disabled && !isRolling ? { scale: 1.02, y: -2 } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.98, y: 0 } : {}}
      >
        {/* Wood grain texture overlay */}
        <div 
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.1) 2px,
                rgba(0,0,0,0.1) 4px
              )
            `
          }}
        />

        {/* Inner felt/velvet surface */}
        <div 
          className={cn(
            "relative rounded-xl overflow-hidden",
            compact ? "p-2" : "p-3"
          )}
          style={{
            background: 'linear-gradient(145deg, #1B5E20 0%, #145214 50%, #0D3B0D 100%)',
            boxShadow: `
              inset 0 2px 8px rgba(0,0,0,0.6),
              inset 0 -1px 4px rgba(76,175,80,0.2)
            `,
          }}
        >
          {/* Glowing ring when can roll */}
          <AnimatePresence>
            {canRoll && !disabled && !isRolling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  boxShadow: '0 0 20px rgba(255,215,0,0.5), inset 0 0 15px rgba(255,215,0,0.15)',
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {isRolling ? (
              <motion.div
                key="rolling"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <BouncingDice value={value} size={diceSize} />
              </motion.div>
            ) : (
              <motion.div
                key={`result-${value}`}
                initial={{ opacity: 0, scale: 0.6, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 200, 
                  damping: 15,
                  mass: 0.8
                }}
              >
                <Dice3DCube value={value} isRolling={false} size={diceSize} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Six bonus badge */}
        <AnimatePresence>
          {showSixBonus && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 10, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-black text-white shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 40%, #FF6B00 100%)',
                boxShadow: '0 3px 10px rgba(255,165,0,0.6), 0 0 20px rgba(255,215,0,0.4)',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              🎉 +1
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Premium Roll Button */}
      <motion.button
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'relative rounded-xl font-bold overflow-hidden transition-all',
          compact ? 'px-5 py-3 text-xs' : 'px-7 py-3.5 text-sm',
          canRoll && !disabled && !isRolling
            ? 'text-amber-900'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed border-gray-600'
        )}
        style={canRoll && !disabled && !isRolling ? {
          background: 'linear-gradient(180deg, #FFE082 0%, #FFD54F 25%, #FFCA28 50%, #FFB300 75%, #FF8F00 100%)',
          boxShadow: `
            0 4px 15px rgba(255,152,0,0.5),
            0 2px 6px rgba(0,0,0,0.2),
            inset 0 2px 4px rgba(255,255,255,0.5),
            inset 0 -2px 4px rgba(0,0,0,0.1)
          `,
          border: '2px solid #F57C00',
          borderTopColor: '#FFB74D',
          borderBottomColor: '#E65100',
        } : {
          border: '2px solid #555',
        }}
        whileHover={canRoll && !disabled && !isRolling ? { 
          scale: 1.03, 
          y: -2,
          boxShadow: '0 6px 20px rgba(255,152,0,0.6), 0 3px 10px rgba(0,0,0,0.3)'
        } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.97, y: 0 } : {}}
      >
        {/* Animated shine */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
            }}
            animate={{ x: ['-150%', '150%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
          />
        )}
        
        <span className="relative z-10 flex items-center gap-2 font-black tracking-wide">
          {isRolling ? (
            <>
              <motion.span
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
                className="text-lg"
              >
                🎲
              </motion.span>
              <span>Rolling...</span>
            </>
          ) : canRoll ? (
            <>
              <span className="text-lg">🎲</span>
              <span>TAP TO ROLL</span>
            </>
          ) : (
            <>
              <span className="text-base">⏳</span>
              <span>Wait...</span>
            </>
          )}
        </span>
      </motion.button>
    </div>
  );
};

export default LudoDice;
