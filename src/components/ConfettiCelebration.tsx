import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  duration?: number;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  'hsl(45, 100%, 50%)',    // Gold
  'hsl(200, 100%, 50%)',   // Cyan
  'hsl(330, 100%, 60%)',   // Pink
  'hsl(120, 70%, 50%)',    // Green
  'hsl(270, 100%, 60%)',   // Purple
  'hsl(30, 100%, 55%)',    // Orange
];

const ConfettiCelebration = ({ isActive, duration = 3000, onComplete }: ConfettiCelebrationProps) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      // Generate confetti pieces
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 50; i++) {
        pieces.push({
          id: i,
          x: Math.random() * 100,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
        });
      }
      setConfetti(pieces);

      // Clear after duration
      const timer = setTimeout(() => {
        setConfetti([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete]);

  return (
    <AnimatePresence>
      {isActive && confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2 + Math.random(),
                delay: piece.delay,
                ease: 'easeIn',
              }}
              style={{
                position: 'absolute',
                width: 12 * piece.scale,
                height: 12 * piece.scale,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
          
          {/* Sparkle bursts */}
          {[0, 1, 2].map((idx) => (
            <motion.div
              key={`burst-${idx}`}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 2, 3], opacity: [1, 0.5, 0] }}
              transition={{
                duration: 0.8,
                delay: idx * 0.15,
                ease: 'easeOut',
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div 
                className="w-40 h-40 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${CONFETTI_COLORS[idx]} 0%, transparent 70%)`,
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfettiCelebration;
