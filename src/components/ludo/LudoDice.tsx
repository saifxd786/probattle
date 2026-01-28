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

// Premium 3D Dice Face with realistic ivory dots
const DiceFace = ({ value, faceStyle }: { value: number; faceStyle?: React.CSSProperties }) => {
  const dots = getDotPositions(value);
  
  return (
    <div 
      className="absolute w-full h-full flex items-center justify-center"
      style={{
        background: `
          linear-gradient(145deg, 
            #FFFEF8 0%, 
            #FBF9F3 15%,
            #F5F2EA 35%, 
            #EDE9DF 55%,
            #E5E0D4 75%,
            #DDD8CC 100%
          )
        `,
        boxShadow: `
          inset 0 3px 6px rgba(255,255,255,0.9),
          inset 0 -3px 6px rgba(0,0,0,0.12),
          inset 3px 0 6px rgba(255,255,255,0.6),
          inset -3px 0 6px rgba(0,0,0,0.08)
        `,
        border: '1px solid rgba(160,150,130,0.4)',
        borderRadius: '12%',
        backfaceVisibility: 'hidden',
        ...faceStyle
      }}
    >
      {/* Subtle texture overlay */}
      <div 
        className="absolute inset-1 rounded-lg opacity-30 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(0,0,0,0.05) 0%, transparent 50%)
          `
        }}
      />
      <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] relative z-10">
        <defs>
          {/* Premium ruby red gradient for dots */}
          <radialGradient id={`dotGrad-${value}`} cx="30%" cy="30%">
            <stop offset="0%" stopColor="#E53935" />
            <stop offset="35%" stopColor="#C62828" />
            <stop offset="70%" stopColor="#8B0000" />
            <stop offset="100%" stopColor="#5D0000" />
          </radialGradient>
          {/* Inner highlight for 3D effect */}
          <radialGradient id={`dotHighlight-${value}`} cx="35%" cy="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id={`dotShadow-${value}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0.8" dy="2" stdDeviation="1.2" floodColor="#000" floodOpacity="0.4" />
          </filter>
        </defs>
        {dots.map((dot, idx) => (
          <g key={idx}>
            {/* Main dot */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="11"
              fill={`url(#dotGrad-${value})`}
              filter={`url(#dotShadow-${value})`}
            />
            {/* Highlight overlay */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="11"
              fill={`url(#dotHighlight-${value})`}
            />
            {/* Inner depth ring */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="9"
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="0.5"
            />
          </g>
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
      {/* Ultra Premium Wooden Dice Platform */}
      <motion.div
        className={cn(
          'relative rounded-2xl',
          compact ? 'p-3' : 'p-4',
          canRoll && !disabled && !isRolling && 'cursor-pointer'
        )}
        style={{
          background: `
            linear-gradient(180deg, 
              #4A3728 0%, 
              #3D2E23 10%,
              #2F231A 30%, 
              #251B14 60%,
              #1A130E 85%,
              #120D09 100%
            )
          `,
          boxShadow: `
            inset 0 3px 8px rgba(139,90,43,0.35),
            inset 0 -4px 10px rgba(0,0,0,0.6),
            inset 3px 0 6px rgba(139,90,43,0.2),
            inset -3px 0 6px rgba(0,0,0,0.4),
            0 8px 25px rgba(0,0,0,0.6),
            0 3px 10px rgba(0,0,0,0.4)
          `,
          border: '4px solid #5D4C3B',
          borderTopColor: '#7D6B59',
          borderBottomColor: '#2A1F17',
        }}
        onClick={handleRoll}
        whileHover={canRoll && !disabled && !isRolling ? { scale: 1.03, y: -3 } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.97, y: 0 } : {}}
      >
        {/* Wood grain texture overlay */}
        <div 
          className="absolute inset-0 rounded-xl opacity-15 pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                95deg,
                transparent,
                transparent 3px,
                rgba(0,0,0,0.1) 3px,
                rgba(0,0,0,0.1) 5px
              ),
              repeating-linear-gradient(
                85deg,
                transparent,
                transparent 8px,
                rgba(139,90,43,0.08) 8px,
                rgba(139,90,43,0.08) 10px
              )
            `
          }}
        />

        {/* Corner metal studs */}
        {[
          { top: 4, left: 4 },
          { top: 4, right: 4 },
          { bottom: 4, left: 4 },
          { bottom: 4, right: 4 }
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              ...pos,
              background: 'linear-gradient(135deg, #C9A86C 0%, #8B6914 50%, #5C4A10 100%)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.5)'
            }}
          />
        ))}

        {/* Inner velvet/felt surface */}
        <div 
          className={cn(
            "relative rounded-xl overflow-hidden",
            compact ? "p-2.5" : "p-3.5"
          )}
          style={{
            background: `
              radial-gradient(ellipse at 50% 30%, #1E6B22 0%, #15571A 30%, #0F4210 60%, #092F0A 100%)
            `,
            boxShadow: `
              inset 0 4px 12px rgba(0,0,0,0.7),
              inset 0 -2px 6px rgba(76,175,80,0.15),
              inset 4px 0 8px rgba(0,0,0,0.3),
              inset -4px 0 8px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* Felt texture */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Glowing ring when can roll */}
          <AnimatePresence>
            {canRoll && !disabled && !isRolling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  boxShadow: '0 0 25px rgba(255,215,0,0.6), inset 0 0 20px rgba(255,215,0,0.2)',
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

        {/* Six bonus badge - Enhanced */}
        <AnimatePresence>
          {showSixBonus && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 10, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="absolute -top-3 -right-3 px-2.5 py-1.5 rounded-full text-xs font-black text-white shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #FFE082 0%, #FFD54F 25%, #FFCA28 50%, #FF9800 75%, #F57C00 100%)',
                boxShadow: '0 4px 15px rgba(255,152,0,0.7), 0 0 25px rgba(255,215,0,0.5)',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              🎉 +1
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Ultra Premium Roll Button */}
      <motion.button
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'relative rounded-xl font-bold overflow-hidden transition-all',
          compact ? 'px-5 py-3 text-xs' : 'px-8 py-4 text-sm',
          canRoll && !disabled && !isRolling
            ? 'text-amber-950'
            : 'bg-gradient-to-b from-gray-600 to-gray-800 text-gray-400 cursor-not-allowed'
        )}
        style={canRoll && !disabled && !isRolling ? {
          background: `
            linear-gradient(180deg, 
              #FFF8E1 0%, 
              #FFECB3 15%,
              #FFD54F 35%, 
              #FFC107 55%,
              #FFB300 75%,
              #FF8F00 90%,
              #E65100 100%
            )
          `,
          boxShadow: `
            0 6px 20px rgba(255,152,0,0.5),
            0 3px 8px rgba(0,0,0,0.25),
            inset 0 2px 6px rgba(255,255,255,0.7),
            inset 0 -3px 6px rgba(0,0,0,0.15)
          `,
          border: '3px solid #F57C00',
          borderTopColor: '#FFB74D',
          borderBottomColor: '#BF360C',
        } : {
          border: '3px solid #444',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
        }}
        whileHover={canRoll && !disabled && !isRolling ? { 
          scale: 1.05, 
          y: -3,
          boxShadow: '0 10px 30px rgba(255,152,0,0.6), 0 5px 15px rgba(0,0,0,0.3)'
        } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.95, y: 0 } : {}}
      >
        {/* Animated shine effect */}
        {canRoll && !disabled && !isRolling && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)',
            }}
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          />
        )}
        
        {/* Button content */}
        <span className="relative z-10 flex items-center gap-2.5 font-black tracking-wider uppercase">
          {isRolling ? (
            <>
              <motion.span
                animate={{ rotate: 360, scale: [1, 1.3, 1] }}
                transition={{ duration: 0.35, repeat: Infinity, ease: 'linear' }}
                className="text-xl"
              >
                🎲
              </motion.span>
              <span className="text-amber-900">Rolling...</span>
            </>
          ) : canRoll ? (
            <>
              <motion.span 
                className="text-xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                🎲
              </motion.span>
              <span>Tap to Roll</span>
            </>
          ) : (
            <>
              <motion.span 
                className="text-lg"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⏳
              </motion.span>
              <span>Waiting...</span>
            </>
          )}
        </span>

        {/* Bottom edge highlight */}
        {canRoll && !disabled && !isRolling && (
          <div 
            className="absolute bottom-0 left-2 right-2 h-1 rounded-full opacity-50"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)'
            }}
          />
        )}
      </motion.button>
    </div>
  );
};

export default LudoDice;
