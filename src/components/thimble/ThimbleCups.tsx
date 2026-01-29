import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ThimbleDifficulty } from '@/hooks/useThimbleGame';

interface ThimbleCupsProps {
  phase: 'showing' | 'shuffling' | 'selecting' | 'revealing' | 'result';
  ballPosition: number;
  selectedCup: number | null;
  isWin: boolean | null;
  difficulty: ThimbleDifficulty;
  shuffleDuration: number;
  onSelectCup: (index: number) => void;
  onCupOrderChange?: (order: number[]) => void;
}

const ThimbleCups = ({
  phase,
  ballPosition,
  selectedCup,
  isWin,
  difficulty,
  shuffleDuration,
  onSelectCup,
  onCupOrderChange
}: ThimbleCupsProps) => {
  const [cupOrder, setCupOrder] = useState([0, 1, 2]);
  const [liftedCup, setLiftedCup] = useState<number | null>(null);
  const shuffleRef = useRef<NodeJS.Timeout[]>([]);

  // IMPORTANT: Difficulty is NOT based on shuffle speed.
  // We use shuffleDuration to keep the same (fast) shuffle animation across all modes.
  // Difficulty is determined by selection time.
  void difficulty;
  const shuffles = 10;
  const pauseBetween = 20;
  const speed = Math.max(60, Math.floor(shuffleDuration / shuffles) - pauseBetween);
  const config = { shuffles, speed, pauseBetween };

  // Handle showing phase - lift cup to show ball
  useEffect(() => {
    if (phase === 'showing') {
      setLiftedCup(ballPosition);
      const order = [0, 1, 2];
      setCupOrder(order);
      onCupOrderChange?.(order);
    } else if (phase === 'shuffling') {
      setLiftedCup(null);
    }
  }, [phase, ballPosition, onCupOrderChange]);

  // Smooth shuffle animation
  useEffect(() => {
    if (phase !== 'shuffling') return;

    let currentOrder = [0, 1, 2];
    let shuffleCount = 0;

    const doShuffle = () => {
      if (shuffleCount >= config.shuffles) {
        return;
      }

      // Swap two random adjacent or non-adjacent cups
      const i = Math.floor(Math.random() * 3);
      let j = (i + 1 + Math.floor(Math.random() * 2)) % 3;
      
      const newOrder = [...currentOrder];
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      currentOrder = newOrder;

      setCupOrder([...currentOrder]);
      onCupOrderChange?.([...currentOrder]);
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
  }, [phase, config.shuffles, config.speed, config.pauseBetween, onCupOrderChange]);

  // Handle revealing phase - lift ALL cups to show ball position
  useEffect(() => {
    if (phase === 'revealing') {
      // Lift all cups to reveal where the ball is
      setLiftedCup(-1); // Special value to lift all cups
    } else if (phase === 'result') {
      // Keep all cups lifted in result phase
      setLiftedCup(-1);
    }
  }, [phase]);

  // Get responsive gap spacing between cups
  const getGapSpacing = () => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    if (screenWidth < 360) return 16;
    if (screenWidth < 400) return 20;
    if (screenWidth < 500) return 28;
    return 36;
  };

  const renderCup = (cupIndex: number) => {
    // Lift all cups during revealing/result, or specific cup during showing
    const isLifted = liftedCup === -1 || liftedCup === cupIndex;
    const hasBall = ballPosition === cupIndex;
    const isSelected = selectedCup === cupIndex;
    const canSelect = phase === 'selecting';
    const isRevealingOrResult = phase === 'revealing' || phase === 'result';
    
    // Get the visual order position for this cup (0=left, 1=center, 2=right)
    const orderPosition = cupOrder.indexOf(cupIndex);

    return (
      <motion.div
        key={cupIndex}
        layout // Enable layout-based animation - no manual positioning needed!
        className="relative cursor-pointer"
        style={{ order: orderPosition }} // CSS order property handles positioning
        animate={{
          y: isLifted ? -90 : 0,
          rotateZ: isLifted ? -5 : 0
        }}
        transition={{
          layout: { type: 'spring', stiffness: 400, damping: 30 },
          y: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
          rotateZ: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }
        }}
        onClick={() => canSelect && onSelectCup(cupIndex)}
        whileHover={canSelect ? { scale: 1.08, y: -8 } : {}}
        whileTap={canSelect ? { scale: 0.95 } : {}}
      >
        {/* Ball */}
        <motion.div
          className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full z-0"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: hasBall && (phase === 'showing' || isRevealingOrResult) ? 1 : 0,
            scale: hasBall && (phase === 'showing' || isRevealingOrResult) ? 1 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ff7b7b, #c92a2a 60%, #8b0000)',
            boxShadow: '0 6px 20px rgba(201, 42, 42, 0.6), inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 3px 6px rgba(255,255,255,0.3)'
          }}
        />

        {/* Cup */}
        <motion.svg 
          viewBox="0 0 110 95" 
          className="relative z-10 drop-shadow-lg w-[60px] h-[52px] sm:w-[80px] sm:h-[70px] md:w-[100px] md:h-[88px]"
          animate={{
            filter: canSelect ? 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          <defs>
            <linearGradient id={`cupGrad${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A574" />
              <stop offset="30%" stopColor="#8B5A2B" />
              <stop offset="60%" stopColor="#6B4423" />
              <stop offset="100%" stopColor="#4A2C17" />
            </linearGradient>
            <linearGradient id={`rimGrad${cupIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E8C99B" />
              <stop offset="100%" stopColor="#A67B5B" />
            </linearGradient>
            <linearGradient id={`highlightGrad${cupIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          
          {/* Cup body */}
          <path
            d="M 15 8 L 95 8 L 82 85 C 80 92 65 95 55 95 C 45 95 30 92 28 85 L 15 8"
            fill={`url(#cupGrad${cupIndex})`}
          />
          
          {/* Rim */}
          <ellipse cx="55" cy="10" rx="42" ry="10" fill={`url(#rimGrad${cupIndex})`} />
          
          {/* Inner rim shadow */}
          <ellipse cx="55" cy="10" rx="35" ry="7" fill="rgba(0,0,0,0.3)" />
          
          {/* Left highlight */}
          <path
            d="M 22 15 L 32 80 L 25 80 L 18 15"
            fill={`url(#highlightGrad${cupIndex})`}
          />
          
          {/* Right shadow */}
          <path
            d="M 78 15 L 85 80 L 92 80 L 92 15"
            fill="rgba(0,0,0,0.2)"
          />
          
          {/* Decorative bands */}
          <path d="M 23 30 L 87 30 L 85 38 L 25 38 Z" fill="rgba(255,255,255,0.15)" />
          <path d="M 26 50 L 84 50 L 82 55 L 28 55 Z" fill="rgba(0,0,0,0.1)" />
          
          {/* Bottom edge */}
          <ellipse cx="55" cy="88" rx="27" ry="5" fill="rgba(0,0,0,0.3)" />
        </motion.svg>

        {/* Selection indicator */}
        {isSelected && isRevealingOrResult && (
          <motion.div
            className={`absolute -bottom-10 left-1/2 -translate-x-1/2 text-3xl font-bold ${
              isWin ? 'text-green-400' : 'text-red-400'
            }`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {isWin ? '✓' : '✗'}
          </motion.div>
        )}

        {/* Hover glow for selecting phase */}
        {canSelect && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 25px rgba(255, 215, 0, 0.3)',
                '0 0 45px rgba(255, 215, 0, 0.6)',
                '0 0 25px rgba(255, 215, 0, 0.3)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    );
  };

  const gapSpacing = getGapSpacing();

  return (
    <div className="relative flex items-center justify-center h-48 w-full px-4">
      {/* Table surface */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-12 rounded-t-3xl"
        style={{
          background: 'linear-gradient(180deg, hsl(140 45% 35%) 0%, hsl(140 45% 22%) 100%)',
          boxShadow: 'inset 0 4px 15px rgba(255,255,255,0.15), inset 0 -4px 10px rgba(0,0,0,0.3)'
        }}
      />
      
      {/* Table felt texture effect */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-12 rounded-t-3xl opacity-30"
        style={{
          background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'
        }}
      />

      {/* Cups container - uses flexbox with CSS order for positioning */}
      {/* Each cup stays in its flex slot, only the order changes - NO OVERLAP POSSIBLE */}
      <div 
        className="relative flex items-end justify-center pb-6"
        style={{ gap: `${gapSpacing}px` }}
      >
        {[0, 1, 2].map(renderCup)}
      </div>
    </div>
  );
};

export default ThimbleCups;