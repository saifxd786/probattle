import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ThimbleDifficulty } from '@/hooks/useThimbleGame';

interface ThimbleCupsProps {
  phase: 'showing' | 'shuffling' | 'selecting' | 'result';
  ballPosition: number;
  selectedCup: number | null;
  isWin: boolean | null;
  difficulty: ThimbleDifficulty;
  shuffleDuration: number;
  onSelectCup: (index: number) => void;
}

const ThimbleCups = ({
  phase,
  ballPosition,
  selectedCup,
  isWin,
  difficulty,
  shuffleDuration,
  onSelectCup
}: ThimbleCupsProps) => {
  const [cupOrder, setCupOrder] = useState([0, 1, 2]);
  const [liftedCup, setLiftedCup] = useState<number | null>(null);
  const shuffleRef = useRef<NodeJS.Timeout[]>([]);

  const difficultyConfig = {
    easy: { shuffles: 5, speed: 600, pauseBetween: 150 },
    hard: { shuffles: 8, speed: 350, pauseBetween: 100 },
    impossible: { shuffles: 14, speed: 180, pauseBetween: 50 }
  };

  const config = difficultyConfig[difficulty];

  // Handle showing phase - lift cup to show ball
  useEffect(() => {
    if (phase === 'showing') {
      setLiftedCup(ballPosition);
      setCupOrder([0, 1, 2]);
    } else if (phase === 'shuffling') {
      setLiftedCup(null);
    }
  }, [phase, ballPosition]);

  // Smooth shuffle animation
  useEffect(() => {
    if (phase !== 'shuffling') return;

    let currentOrder = [0, 1, 2];
    let shuffleCount = 0;

    const doShuffle = () => {
      if (shuffleCount >= config.shuffles) {
        return;
      }

      const i = Math.floor(Math.random() * 3);
      let j = (i + 1 + Math.floor(Math.random() * 2)) % 3;
      
      const newOrder = [...currentOrder];
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      currentOrder = newOrder;

      setCupOrder([...currentOrder]);
      shuffleCount++;

      const timeout = setTimeout(doShuffle, config.speed + config.pauseBetween);
      shuffleRef.current.push(timeout);
    };

    const startTimeout = setTimeout(doShuffle, 300);
    shuffleRef.current.push(startTimeout);

    return () => {
      shuffleRef.current.forEach(clearTimeout);
      shuffleRef.current = [];
    };
  }, [phase, config.shuffles, config.speed, config.pauseBetween]);

  // Show result - lift selected cup
  useEffect(() => {
    if (phase === 'result' && selectedCup !== null) {
      setLiftedCup(selectedCup);
    }
  }, [phase, selectedCup]);

  // Get X position based on cup's position in order array
  const getXPosition = (cupIndex: number) => {
    const orderIndex = cupOrder.indexOf(cupIndex);
    const spacing = typeof window !== 'undefined' && window.innerWidth < 400 ? 95 : 130;
    return (orderIndex - 1) * spacing;
  };

  const renderCup = (cupIndex: number) => {
    const isLifted = liftedCup === cupIndex;
    const hasBall = ballPosition === cupIndex;
    const isSelected = selectedCup === cupIndex;
    const canSelect = phase === 'selecting';

    // Cup size for top-down 3D view
    const cupSize = typeof window !== 'undefined' && window.innerWidth < 400 ? 80 : 110;

    return (
      <motion.div
        key={cupIndex}
        className="relative cursor-pointer"
        style={{ width: cupSize, height: cupSize + 20 }}
        animate={{
          x: getXPosition(cupIndex),
          scale: isLifted ? 0.65 : 1,
          y: isLifted ? -45 : 0,
          rotateX: isLifted ? 15 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 24,
          mass: 0.9
        }}
        onClick={() => canSelect && onSelectCup(cupIndex)}
        whileHover={canSelect ? { scale: 1.08, y: -8, rotateX: 5 } : {}}
        whileTap={canSelect ? { scale: 0.92 } : {}}
      >
        {/* Ball - visible when cup is lifted */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-0"
          style={{ top: '15%' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: hasBall && (phase === 'showing' || phase === 'result') ? 1 : 0,
            scale: hasBall && (phase === 'showing' || phase === 'result') ? 1 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {/* Professional 3D Ball */}
          <div className="relative">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <defs>
                <radialGradient id="ballGradient" cx="35%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#FF4757" />
                  <stop offset="40%" stopColor="#C0392B" />
                  <stop offset="80%" stopColor="#8B0000" />
                  <stop offset="100%" stopColor="#5D0000" />
                </radialGradient>
                <radialGradient id="ballHighlight" cx="30%" cy="25%" r="40%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <filter id="ballShadow">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5"/>
                </filter>
              </defs>
              {/* Ball shadow */}
              <ellipse cx="24" cy="44" rx="16" ry="4" fill="rgba(0,0,0,0.4)" />
              {/* Main ball */}
              <circle cx="24" cy="24" r="18" fill="url(#ballGradient)" filter="url(#ballShadow)" />
              {/* Ball highlight */}
              <ellipse cx="18" cy="16" rx="8" ry="6" fill="url(#ballHighlight)" />
              {/* Secondary shine */}
              <ellipse cx="14" cy="14" rx="3" ry="2" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>
        </motion.div>

        {/* 3D Cup - Professional Top-Down View */}
        <motion.div
          className="absolute inset-0 z-10"
          style={{ perspective: '500px' }}
          animate={{
            opacity: isLifted ? 0.35 : 1,
          }}
        >
          <svg viewBox="0 0 120 140" className="w-full h-full" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}>
            <defs>
              {/* Premium copper/bronze gradient */}
              <linearGradient id={`cupBody${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CD853F" />
                <stop offset="20%" stopColor="#B8860B" />
                <stop offset="40%" stopColor="#8B6914" />
                <stop offset="60%" stopColor="#CD853F" />
                <stop offset="80%" stopColor="#DAA520" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              
              {/* Cup rim gradient - golden */}
              <linearGradient id={`cupRim${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="25%" stopColor="#DAA520" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="75%" stopColor="#B8860B" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
              
              {/* Inner darkness */}
              <radialGradient id={`cupInner${cupIndex}`} cx="50%" cy="40%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="50%" stopColor="#0a0a0a" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              
              {/* Top highlight */}
              <linearGradient id={`topShine${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              
              {/* Side reflection */}
              <linearGradient id={`sideReflect${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                <stop offset="30%" stopColor="transparent" />
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
              </linearGradient>

              {/* Glow filter */}
              <filter id={`cupGlow${cupIndex}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Cup shadow on table */}
            <ellipse cx="60" cy="135" rx="45" ry="12" fill="rgba(0,0,0,0.5)" />
            
            {/* Cup body - tapered cylinder effect */}
            <path
              d={`
                M 18 45
                C 18 45, 12 85, 20 120
                Q 25 130, 60 130
                Q 95 130, 100 120
                C 108 85, 102 45, 102 45
                Z
              `}
              fill={`url(#cupBody${cupIndex})`}
              stroke="#8B6914"
              strokeWidth="1"
            />
            
            {/* Left reflection stripe */}
            <path
              d={`
                M 22 50
                C 20 50, 16 85, 24 118
                C 24 118, 28 85, 30 50
                Z
              `}
              fill="rgba(255,255,255,0.15)"
            />
            
            {/* Right edge shadow */}
            <path
              d={`
                M 98 50
                C 100 50, 104 85, 96 118
                C 96 118, 92 85, 90 50
                Z
              `}
              fill="rgba(0,0,0,0.2)"
            />
            
            {/* Decorative rings on cup body */}
            <ellipse cx="60" cy="60" rx="40" ry="10" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="2" />
            <ellipse cx="60" cy="90" rx="35" ry="8" fill="none" stroke="rgba(255,215,0,0.2)" strokeWidth="1.5" />
            
            {/* Top rim - outer ellipse */}
            <ellipse 
              cx="60" cy="45" rx="44" ry="18" 
              fill={`url(#cupRim${cupIndex})`}
              stroke="#DAA520"
              strokeWidth="2"
            />
            
            {/* Inner rim edge */}
            <ellipse 
              cx="60" cy="45" rx="36" ry="14" 
              fill={`url(#cupInner${cupIndex})`}
              stroke="#5D4E37"
              strokeWidth="1.5"
            />
            
            {/* Rim highlight arc */}
            <path
              d="M 20 38 Q 40 22 60 20 Q 80 22 100 38"
              fill="none"
              stroke={`url(#topShine${cupIndex})`}
              strokeWidth="5"
              strokeLinecap="round"
            />
            
            {/* Top highlight spot */}
            <ellipse 
              cx="40" cy="35" rx="12" ry="6" 
              fill="rgba(255,255,255,0.3)"
              transform="rotate(-15 40 35)"
            />
            
            {/* Secondary shine spot */}
            <ellipse 
              cx="32" cy="32" rx="4" ry="2" 
              fill="rgba(255,255,255,0.6)"
              transform="rotate(-20 32 32)"
            />
            
            {/* Handle knob on top */}
            <ellipse cx="60" cy="45" rx="8" ry="4" fill="#B8860B" stroke="#DAA520" strokeWidth="1" />
            <ellipse cx="60" cy="44" rx="4" ry="2" fill="rgba(255,255,255,0.4)" />
          </svg>
        </motion.div>

        {/* Selection indicator */}
        {isSelected && phase === 'result' && (
          <motion.div
            className={`absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
          >
            <div className={`text-4xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
              {isWin ? '✓' : '✗'}
            </div>
            <span className={`text-xs font-medium ${isWin ? 'text-green-400' : 'text-red-400'}`}>
              {isWin ? 'WINNER!' : 'WRONG'}
            </span>
          </motion.div>
        )}

        {/* Pulsing selection glow */}
        {canSelect && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ top: '20%' }}
            animate={{
              boxShadow: [
                '0 0 25px 8px rgba(255, 215, 0, 0.15)',
                '0 0 45px 15px rgba(255, 215, 0, 0.35)',
                '0 0 25px 8px rgba(255, 215, 0, 0.15)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        )}

        {/* Cup number badge */}
        <motion.div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2"
          animate={{ opacity: canSelect ? 1 : 0.4 }}
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-amber-500/50 flex items-center justify-center shadow-lg">
              <span className="text-xs font-bold text-amber-400">{cupIndex + 1}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-10">
      {/* Casino table surface */}
      <div 
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 120% 100% at 50% 0%, 
              hsl(145 45% 30%) 0%,
              hsl(145 50% 22%) 40%,
              hsl(145 55% 16%) 70%,
              hsl(145 60% 12%) 100%
            )
          `,
          boxShadow: `
            inset 0 0 100px rgba(0,0,0,0.5),
            inset 0 -20px 60px rgba(0,0,0,0.3),
            0 15px 50px rgba(0,0,0,0.4)
          `
        }}
      />
      
      {/* Table felt texture overlay */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Ambient lighting from top */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 rounded-b-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)'
        }}
      />
      
      {/* Table edge bevel */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(255,255,255,0.1) 0%, 
              transparent 15%, 
              transparent 85%, 
              rgba(0,0,0,0.25) 100%
            )
          `,
          border: '2px solid rgba(139,105,20,0.3)'
        }}
      />
      
      {/* Decorative table markings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="w-[320px] h-[220px] sm:w-[420px] sm:h-[280px] rounded-[50%] border-2 border-amber-900/20"
          style={{
            boxShadow: 'inset 0 0 30px rgba(139,105,20,0.1)'
          }}
        />
        <div 
          className="absolute w-[200px] h-[140px] sm:w-[260px] sm:h-[180px] rounded-[50%] border border-amber-800/10"
        />
      </div>
      
      {/* Position markers */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-amber-900/30"
            style={{
              transform: `translateX(${(i - 1) * (typeof window !== 'undefined' && window.innerWidth < 400 ? 95 : 130)}px) translateY(55px)`
            }}
          />
        ))}
      </div>

      {/* Cups container */}
      <div className="relative flex items-center justify-center h-56 sm:h-64 w-full z-10">
        <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
          {[0, 1, 2].map(renderCup)}
        </div>
      </div>
      
      {/* Spotlight effect */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] sm:w-[400px] sm:h-[280px] rounded-[50%] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 60%)'
        }}
      />
    </div>
  );
};

export default ThimbleCups;
