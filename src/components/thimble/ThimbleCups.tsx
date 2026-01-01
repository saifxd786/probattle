import { useEffect, useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface ThimbleCupsProps {
  phase: 'showing' | 'shuffling' | 'selecting' | 'result';
  ballPosition: number;
  selectedCup: number | null;
  isWin: boolean | null;
  difficulty: 'easy' | 'hard' | 'impossible';
  shuffleDuration: number;
  onSelectCup: (index: number) => void;
}

const CUP_COLORS = {
  base: 'hsl(30 80% 45%)',
  rim: 'hsl(30 80% 55%)',
  highlight: 'hsl(30 80% 65%)',
  shadow: 'hsl(30 80% 25%)'
};

const ThimbleCups = ({
  phase,
  ballPosition,
  selectedCup,
  isWin,
  difficulty,
  shuffleDuration,
  onSelectCup
}: ThimbleCupsProps) => {
  const [cupPositions, setCupPositions] = useState([0, 1, 2]);
  const [liftedCup, setLiftedCup] = useState<number | null>(null);
  const shuffleRef = useRef<NodeJS.Timeout[]>([]);

  const difficultyConfig = {
    easy: { shuffles: 6, speed: 500 },
    hard: { shuffles: 10, speed: 300 },
    impossible: { shuffles: 16, speed: 150 }
  };

  const config = difficultyConfig[difficulty];

  // Handle showing phase - lift cup to show ball
  useEffect(() => {
    if (phase === 'showing') {
      setLiftedCup(ballPosition);
      setCupPositions([0, 1, 2]);
    } else if (phase === 'shuffling') {
      setLiftedCup(null);
    }
  }, [phase, ballPosition]);

  // Shuffle animation
  useEffect(() => {
    if (phase !== 'shuffling') return;

    const positions = [0, 1, 2];
    let currentPositions = [...positions];
    let shuffleCount = 0;

    const doShuffle = () => {
      if (shuffleCount >= config.shuffles) {
        return;
      }

      // Random swap
      const i = Math.floor(Math.random() * 3);
      let j = Math.floor(Math.random() * 3);
      while (j === i) j = Math.floor(Math.random() * 3);

      const temp = currentPositions[i];
      currentPositions[i] = currentPositions[j];
      currentPositions[j] = temp;

      setCupPositions([...currentPositions]);
      shuffleCount++;

      const timeout = setTimeout(doShuffle, config.speed);
      shuffleRef.current.push(timeout);
    };

    const startTimeout = setTimeout(doShuffle, 200);
    shuffleRef.current.push(startTimeout);

    return () => {
      shuffleRef.current.forEach(clearTimeout);
      shuffleRef.current = [];
    };
  }, [phase, config.shuffles, config.speed]);

  // Show result - lift selected cup
  useEffect(() => {
    if (phase === 'result' && selectedCup !== null) {
      setLiftedCup(selectedCup);
    }
  }, [phase, selectedCup]);

  // Get visual position from logical position
  const getXPosition = (logicalPos: number) => {
    const cupIndex = cupPositions.indexOf(logicalPos);
    const positions = [-120, 0, 120];
    return positions[cupIndex];
  };

  const renderCup = (cupIndex: number) => {
    const isLifted = liftedCup === cupIndex;
    const hasBall = ballPosition === cupIndex;
    const isSelected = selectedCup === cupIndex;
    const canSelect = phase === 'selecting';

    return (
      <motion.div
        key={cupIndex}
        className="relative cursor-pointer"
        initial={{ x: (cupIndex - 1) * 120 }}
        animate={{
          x: getXPosition(cupIndex),
          y: isLifted ? -80 : 0
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25
        }}
        onClick={() => canSelect && onSelectCup(cupIndex)}
        whileHover={canSelect ? { scale: 1.05 } : {}}
        whileTap={canSelect ? { scale: 0.95 } : {}}
      >
        {/* Ball */}
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full z-0"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: hasBall && (phase === 'showing' || phase === 'result') ? 1 : 0,
            scale: hasBall && (phase === 'showing' || phase === 'result') ? 1 : 0
          }}
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #c92a2a)',
            boxShadow: '0 4px 12px rgba(201, 42, 42, 0.5), inset 0 -4px 8px rgba(0,0,0,0.3)'
          }}
        />

        {/* Cup */}
        <svg width="100" height="80" viewBox="0 0 100 80" className="relative z-10">
          {/* Cup body */}
          <path
            d="M 15 0 L 85 0 L 75 70 C 75 75 70 80 50 80 C 30 80 25 75 25 70 L 15 0"
            fill={CUP_COLORS.base}
          />
          {/* Rim highlight */}
          <ellipse cx="50" cy="5" rx="35" ry="8" fill={CUP_COLORS.rim} />
          {/* Left highlight */}
          <path
            d="M 20 5 L 30 70 L 25 70 L 15 5"
            fill={CUP_COLORS.highlight}
            opacity={0.5}
          />
          {/* Right shadow */}
          <path
            d="M 70 5 L 75 70 L 80 70 L 85 5"
            fill={CUP_COLORS.shadow}
            opacity={0.5}
          />
          {/* Decorative band */}
          <path
            d="M 22 25 L 78 25 L 76 35 L 24 35 Z"
            fill={CUP_COLORS.highlight}
            opacity={0.7}
          />
        </svg>

        {/* Selection indicator */}
        {isSelected && phase === 'result' && (
          <motion.div
            className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl font-bold ${
              isWin ? 'text-green-400' : 'text-red-400'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            {isWin ? '✓' : '✗'}
          </motion.div>
        )}

        {/* Hover glow */}
        {canSelect && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 20px rgba(255, 215, 0, 0.3)',
                '0 0 40px rgba(255, 215, 0, 0.5)',
                '0 0 20px rgba(255, 215, 0, 0.3)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.div>
    );
  };

  return (
    <div className="relative flex items-center justify-center h-40 w-full overflow-hidden">
      {/* Table surface */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-8 rounded-t-3xl"
        style={{
          background: 'linear-gradient(180deg, hsl(120 40% 30%) 0%, hsl(120 40% 20%) 100%)',
          boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.1)'
        }}
      />

      {/* Cups container */}
      <div className="relative flex items-end justify-center gap-2 pb-4">
        {[0, 1, 2].map(renderCup)}
      </div>
    </div>
  );
};

export default ThimbleCups;
