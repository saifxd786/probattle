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

// Ultra Premium 3D Dice Face with realistic ivory dots and depth
const DiceFace = ({ value, faceStyle, isActive = false }: { value: number; faceStyle?: React.CSSProperties; isActive?: boolean }) => {
  const dots = getDotPositions(value);
  const uniqueId = `face-${value}-${Math.random().toString(36).substr(2, 6)}`;
  
  return (
    <div 
      className="absolute w-full h-full flex items-center justify-center"
      style={{
        background: `
          linear-gradient(145deg, 
            #FFFFFE 0%, 
            #FDFCF9 8%,
            #F9F7F2 20%,
            #F3F0E8 35%, 
            #EBE7DC 55%,
            #E2DDD0 75%,
            #D9D3C4 90%,
            #CFC8B8 100%
          )
        `,
        boxShadow: `
          inset 0 4px 10px rgba(255,255,255,0.95),
          inset 0 -4px 10px rgba(0,0,0,0.15),
          inset 4px 0 8px rgba(255,255,255,0.7),
          inset -4px 0 8px rgba(0,0,0,0.1),
          0 0 1px rgba(0,0,0,0.3)
        `,
        border: '1.5px solid rgba(140,130,110,0.5)',
        borderRadius: '14%',
        backfaceVisibility: 'hidden',
        ...faceStyle
      }}
    >
      {/* Premium ivory texture overlay */}
      <div 
        className="absolute inset-0 rounded-[14%] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.9) 0%, transparent 45%),
            radial-gradient(ellipse at 75% 75%, rgba(0,0,0,0.06) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.04) 100%)
          `,
          opacity: 0.8,
        }}
      />
      
      {/* Subtle edge bevels */}
      <div 
        className="absolute inset-[3px] rounded-[12%] pointer-events-none"
        style={{
          boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(0,0,0,0.08)',
        }}
      />
      
      <svg viewBox="0 0 100 100" className="w-[82%] h-[82%] relative z-10">
        <defs>
          {/* Ultra premium ruby/garnet gradient for dots - deeper 3D */}
          <radialGradient id={`${uniqueId}-dotGrad`} cx="28%" cy="28%">
            <stop offset="0%" stopColor="#FF5252" />
            <stop offset="20%" stopColor="#E53935" />
            <stop offset="45%" stopColor="#C62828" />
            <stop offset="70%" stopColor="#8B0000" />
            <stop offset="90%" stopColor="#5D0000" />
            <stop offset="100%" stopColor="#3D0000" />
          </radialGradient>
          
          {/* Specular highlight */}
          <radialGradient id={`${uniqueId}-dotHighlight`} cx="32%" cy="32%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          
          {/* Bottom reflection */}
          <radialGradient id={`${uniqueId}-dotReflect`} cx="65%" cy="70%">
            <stop offset="0%" stopColor="rgba(255,200,200,0.25)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          
          {/* Enhanced drop shadow with red tint */}
          <filter id={`${uniqueId}-dotShadow`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="1" dy="2.5" stdDeviation="1.5" floodColor="#2D0000" floodOpacity="0.5" />
          </filter>
        </defs>
        
        {dots.map((dot, idx) => (
          <g key={idx}>
            {/* Dot socket/indent */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="12.5"
              fill="rgba(0,0,0,0.08)"
            />
            
            {/* Main gemstone dot */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="11.5"
              fill={`url(#${uniqueId}-dotGrad)`}
              filter={`url(#${uniqueId}-dotShadow)`}
            />
            
            {/* Gemstone facet ring */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="10"
              fill="none"
              stroke="rgba(255,100,100,0.2)"
              strokeWidth="0.8"
            />
            
            {/* Primary specular highlight */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="11.5"
              fill={`url(#${uniqueId}-dotHighlight)`}
            />
            
            {/* Secondary bottom reflection */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r="11.5"
              fill={`url(#${uniqueId}-dotReflect)`}
            />
            
            {/* Tiny bright sparkle */}
            <circle
              cx={dot.x - 3.5}
              cy={dot.y - 3.5}
              r="2"
              fill="rgba(255,255,255,0.85)"
            />
            <circle
              cx={dot.x - 2}
              cy={dot.y - 2}
              r="0.8"
              fill="#fff"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

// True 3D Dice Cube with all 6 faces - Ultra Premium
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
      const startTime = Date.now();
      const animate = () => {
        frame++;
        const elapsed = Date.now() - startTime;
        // Decelerate over time for realistic physics
        const speed = Math.max(0.3, 1 - elapsed / 800);
        
        setRotation({
          x: frame * 28 * speed + Math.random() * 35,
          y: frame * 22 * speed + Math.random() * 30,
          z: frame * 18 * speed + Math.random() * 25,
        });
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        
        if (frame < 24) {
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
        perspective: '500px',
        perspectiveOrigin: '50% 40%'
      }}
    >
      {/* Ambient glow when rolling */}
      {isRolling && (
        <motion.div
          className="absolute inset-[-10px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,200,100,0.3) 0%, transparent 70%)',
          }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
        />
      )}
      
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
          duration: 0.06,
          ease: 'linear'
        } : {
          type: 'spring',
          stiffness: 120,
          damping: 16,
          mass: 1.5,
        }}
      >
        {/* Front face - 1 */}
        <DiceFace value={1} faceStyle={{ transform: faceTransforms.front }} isActive={!isRolling && value === 1} />
        {/* Back face - 6 */}
        <DiceFace value={6} faceStyle={{ transform: faceTransforms.back }} isActive={!isRolling && value === 6} />
        {/* Right face - 2 */}
        <DiceFace value={2} faceStyle={{ transform: faceTransforms.right }} isActive={!isRolling && value === 2} />
        {/* Left face - 5 */}
        <DiceFace value={5} faceStyle={{ transform: faceTransforms.left }} isActive={!isRolling && value === 5} />
        {/* Top face - 3 */}
        <DiceFace value={3} faceStyle={{ transform: faceTransforms.top }} isActive={!isRolling && value === 3} />
        {/* Bottom face - 4 */}
        <DiceFace value={4} faceStyle={{ transform: faceTransforms.bottom }} isActive={!isRolling && value === 4} />
      </motion.div>

      {/* Dynamic shadow - more realistic */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          bottom: -10,
          width: size * 0.9,
          height: size * 0.22,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 35%, transparent 70%)',
        }}
        animate={{
          scale: isRolling ? [1, 0.6, 1.15, 0.7, 1] : 1,
          opacity: isRolling ? [0.4, 0.6, 0.3, 0.5, 0.4] : 0.4,
          y: isRolling ? [0, 4, -2, 3, 0] : 0,
        }}
        transition={{ 
          duration: 0.2, 
          repeat: isRolling ? Infinity : 0,
          ease: 'easeInOut'
        }}
      />
    </div>
  );
};

// Bouncing animation wrapper - Enhanced physics
const BouncingDice = ({ value, size = 72 }: { value: number; size?: number }) => {
  return (
    <motion.div
      animate={{
        y: [0, -25, 0, -15, 0, -8, 0, -3, 0],
        rotate: [0, 10, -8, 5, -3, 2, -1, 0],
        scale: [1, 1.05, 0.98, 1.02, 0.99, 1.01, 1],
      }}
      transition={{ 
        duration: 0.75, 
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.12, 0.28, 0.42, 0.56, 0.68, 0.8, 0.9, 1]
      }}
    >
      <Dice3DCube value={value} isRolling={true} size={size} />
    </motion.div>
  );
};

const LudoDice = ({ value, isRolling, onRoll, disabled, canRoll, compact = false }: LudoDiceProps) => {
  const [showSixBonus, setShowSixBonus] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  const diceSize = compact ? 48 : 72;

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

        {/* Six bonus badge - Ultra Premium */}
        <AnimatePresence>
          {showSixBonus && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 10, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: [0, -5, 5, 0] }}
              exit={{ opacity: 0, scale: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="absolute -top-4 -right-4 px-3 py-2 rounded-full text-sm font-black text-white shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #FFF59D 0%, #FFE082 15%, #FFD54F 35%, #FFCA28 55%, #FF9800 80%, #F57C00 100%)',
                boxShadow: '0 4px 20px rgba(255,152,0,0.8), 0 0 35px rgba(255,215,0,0.6), inset 0 1px 2px rgba(255,255,255,0.5)',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: '2.5px solid rgba(255,255,255,0.4)'
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                🎉 +1
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Ultra Premium Roll Button - Enhanced */}
      <motion.button
        onClick={handleRoll}
        disabled={disabled || !canRoll || isRolling}
        className={cn(
          'relative rounded-2xl font-bold overflow-hidden transition-all',
          compact ? 'px-5 py-3.5 text-xs' : 'px-9 py-5 text-sm',
          canRoll && !disabled && !isRolling
            ? 'text-amber-950'
            : 'bg-gradient-to-b from-gray-600 to-gray-800 text-gray-400 cursor-not-allowed'
        )}
        style={canRoll && !disabled && !isRolling ? {
          background: `
            linear-gradient(180deg, 
              #FFFDE7 0%, 
              #FFF8E1 8%,
              #FFECB3 20%,
              #FFD54F 40%, 
              #FFC107 60%,
              #FFB300 78%,
              #FF8F00 92%,
              #E65100 100%
            )
          `,
          boxShadow: `
            0 8px 30px rgba(255,152,0,0.55),
            0 4px 12px rgba(0,0,0,0.3),
            inset 0 3px 8px rgba(255,255,255,0.8),
            inset 0 -4px 8px rgba(0,0,0,0.2)
          `,
          border: '3px solid #F57C00',
          borderTopColor: '#FFCC80',
          borderBottomColor: '#BF360C',
        } : {
          border: '3px solid #444',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
        }}
        whileHover={canRoll && !disabled && !isRolling ? { 
          scale: 1.06, 
          y: -4,
          boxShadow: '0 12px 40px rgba(255,152,0,0.65), 0 6px 20px rgba(0,0,0,0.35)'
        } : {}}
        whileTap={canRoll && !disabled && !isRolling ? { scale: 0.94, y: 0 } : {}}
      >
        {/* Animated gradient shine effect */}
        {canRoll && !disabled && !isRolling && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.7) 48%, rgba(255,255,255,0.4) 52%, transparent 70%)',
              }}
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
            />
            {/* Outer glow pulse */}
            <motion.div
              className="absolute inset-[-3px] rounded-2xl pointer-events-none"
              style={{ border: '2px solid rgba(255,215,0,0.5)' }}
              animate={{ 
                opacity: [0.3, 0.7, 0.3],
                boxShadow: ['0 0 10px rgba(255,215,0,0.3)', '0 0 25px rgba(255,215,0,0.6)', '0 0 10px rgba(255,215,0,0.3)']
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </>
        )}
        
        {/* Button content */}
        <span className="relative z-10 flex items-center gap-3 font-black tracking-wider uppercase">
          {isRolling ? (
            <>
              <motion.span
                animate={{ rotate: 360, scale: [1, 1.4, 1] }}
                transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
                className="text-2xl"
              >
                🎲
              </motion.span>
              <span className="text-amber-900 font-extrabold">Rolling...</span>
            </>
          ) : canRoll ? (
            <>
              <motion.div className="relative">
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  🎲
                </motion.span>
                {/* Sparkle effect */}
                <motion.span
                  className="absolute -top-1 -right-1 text-[10px]"
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                >
                  ✨
                </motion.span>
              </motion.div>
              <span className="font-extrabold">Tap to Roll</span>
            </>
          ) : (
            <>
              <motion.span 
                className="text-xl"
                animate={{ opacity: [0.4, 1, 0.4], rotate: [0, 180, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⏳
              </motion.span>
              <span className="font-semibold">Waiting...</span>
            </>
          )}
        </span>

        {/* Bottom edge highlight */}
        {canRoll && !disabled && !isRolling && (
          <div 
            className="absolute bottom-1 left-3 right-3 h-1 rounded-full opacity-60"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)'
            }}
          />
        )}
        
        {/* Corner accents */}
        {canRoll && !disabled && !isRolling && (
          <>
            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-amber-200/60 rounded-tl" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-amber-200/60 rounded-tr" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-amber-800/30 rounded-bl" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-amber-800/30 rounded-br" />
          </>
        )}
      </motion.button>
    </div>
  );
};

export default LudoDice;
