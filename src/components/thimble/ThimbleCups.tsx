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
    const spacing = typeof window !== 'undefined' && window.innerWidth < 400 ? 90 : 120;
    return (orderIndex - 1) * spacing;
  };

  const renderCup = (cupIndex: number) => {
    const isLifted = liftedCup === cupIndex;
    const hasBall = ballPosition === cupIndex;
    const isSelected = selectedCup === cupIndex;
    const canSelect = phase === 'selecting';

    // Cup size for top-down view
    const cupSize = typeof window !== 'undefined' && window.innerWidth < 400 ? 70 : 90;

    return (
      <motion.div
        key={cupIndex}
        className="relative cursor-pointer"
        style={{ width: cupSize, height: cupSize }}
        animate={{
          x: getXPosition(cupIndex),
          scale: isLifted ? 0.7 : 1,
          y: isLifted ? -30 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 28,
          mass: 0.8
        }}
        onClick={() => canSelect && onSelectCup(cupIndex)}
        whileHover={canSelect ? { scale: 1.1, y: -5 } : {}}
        whileTap={canSelect ? { scale: 0.95 } : {}}
      >
        {/* Ball - visible when cup is lifted */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-0"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: hasBall && (phase === 'showing' || phase === 'result') ? 1 : 0,
            scale: hasBall && (phase === 'showing' || phase === 'result') ? 1 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b 50%, #8b0000 100%)',
              boxShadow: '0 4px 15px rgba(192, 57, 43, 0.6), inset 0 -3px 8px rgba(0,0,0,0.4), inset 0 3px 8px rgba(255,255,255,0.3)'
            }}
          />
        </motion.div>

        {/* Cup - Top-down view (circular with 3D depth) */}
        <motion.div
          className="absolute inset-0 z-10"
          animate={{
            opacity: isLifted ? 0.4 : 1,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
            <defs>
              {/* Outer cup gradient - wooden/metallic look */}
              <radialGradient id={`cupOuter${cupIndex}`} cx="30%" cy="30%">
                <stop offset="0%" stopColor="#C9A66B" />
                <stop offset="40%" stopColor="#8B6914" />
                <stop offset="70%" stopColor="#6B4423" />
                <stop offset="100%" stopColor="#3D2914" />
              </radialGradient>
              
              {/* Inner cup shadow */}
              <radialGradient id={`cupInner${cupIndex}`} cx="50%" cy="50%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="60%" stopColor="#0d0d0d" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              
              {/* Rim highlight */}
              <linearGradient id={`rimHighlight${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8D5B7" />
                <stop offset="50%" stopColor="#B8860B" />
                <stop offset="100%" stopColor="#8B6914" />
              </linearGradient>
              
              {/* Top highlight arc */}
              <linearGradient id={`topHighlight${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>

              {/* Glow filter for selection */}
              <filter id={`glow${cupIndex}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Outer shadow for 3D effect */}
            <ellipse 
              cx="50" cy="55" rx="42" ry="38" 
              fill="rgba(0,0,0,0.4)"
            />
            
            {/* Outer cup rim */}
            <ellipse 
              cx="50" cy="50" rx="45" ry="42" 
              fill={`url(#cupOuter${cupIndex})`}
              stroke={`url(#rimHighlight${cupIndex})`}
              strokeWidth="3"
            />
            
            {/* Inner cup (dark hole) */}
            <ellipse 
              cx="50" cy="50" rx="32" ry="30" 
              fill={`url(#cupInner${cupIndex})`}
            />
            
            {/* Inner rim edge */}
            <ellipse 
              cx="50" cy="50" rx="32" ry="30" 
              fill="none"
              stroke="#5D4E37"
              strokeWidth="2"
            />
            
            {/* Top-left highlight arc */}
            <path
              d="M 20 40 Q 25 20 50 15 Q 75 20 80 40"
              fill="none"
              stroke={`url(#topHighlight${cupIndex})`}
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* Secondary highlight */}
            <ellipse 
              cx="35" cy="35" rx="8" ry="6" 
              fill="rgba(255,255,255,0.2)"
              transform="rotate(-30 35 35)"
            />
            
            {/* Decorative ring on cup */}
            <ellipse 
              cx="50" cy="50" rx="38" ry="36" 
              fill="none"
              stroke="rgba(255,215,0,0.3)"
              strokeWidth="1"
            />
          </svg>
        </motion.div>

        {/* Selection indicator */}
        {isSelected && phase === 'result' && (
          <motion.div
            className={`absolute -bottom-12 left-1/2 -translate-x-1/2 text-4xl font-bold ${
              isWin ? 'text-green-400' : 'text-red-400'
            }`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {isWin ? '✓' : '✗'}
          </motion.div>
        )}

        {/* Hover/Select glow ring */}
        {canSelect && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 20px 5px rgba(255, 215, 0, 0.2)',
                '0 0 35px 10px rgba(255, 215, 0, 0.4)',
                '0 0 20px 5px rgba(255, 215, 0, 0.2)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          />
        )}

        {/* Cup number indicator */}
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center"
          animate={{ opacity: canSelect ? 1 : 0.5 }}
        >
          <span className="text-xs font-bold text-gray-300">{cupIndex + 1}</span>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      {/* Table surface - Top down view with felt texture */}
      <div 
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%, 
              hsl(140 50% 28%) 0%, 
              hsl(140 50% 20%) 50%,
              hsl(140 45% 15%) 100%
            )
          `,
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), 0 10px 40px rgba(0,0,0,0.3)'
        }}
      />
      
      {/* Table felt texture */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Table edge highlight */}
      <div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)'
        }}
      />
      
      {/* Decorative table markings - subtle circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="w-[280px] h-[200px] sm:w-[360px] sm:h-[260px] rounded-full border border-white/5"
        />
      </div>

      {/* Cups container */}
      <div className="relative flex items-center justify-center h-44 sm:h-52 w-full z-10">
        <div className="relative flex items-center justify-center">
          {[0, 1, 2].map(renderCup)}
        </div>
      </div>
      
      {/* Subtle light source indicator */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full blur-xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 70%)'
        }}
      />
    </div>
  );
};

export default ThimbleCups;
