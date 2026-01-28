import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CaptureAnimationProps {
  isActive: boolean;
  position: { x: number; y: number };
  capturedColor: string;
  onComplete: () => void;
}

const COLORS: Record<string, { main: string; light: string }> = {
  red: { main: '#D32F2F', light: '#EF5350' },
  green: { main: '#388E3C', light: '#66BB6A' },
  yellow: { main: '#FBC02D', light: '#FFEE58' },
  blue: { main: '#1976D2', light: '#42A5F5' }
};

const CaptureAnimation = ({ isActive, position, capturedColor, onComplete }: CaptureAnimationProps) => {
  const [showReturnPath, setShowReturnPath] = useState(false);
  const color = COLORS[capturedColor] || COLORS.red;

  useEffect(() => {
    if (isActive) {
      // Show return path animation after explosion
      const timer = setTimeout(() => {
        setShowReturnPath(true);
      }, 400);

      // Complete animation
      const completeTimer = setTimeout(() => {
        setShowReturnPath(false);
        onComplete();
      }, 1200);

      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Flash overlay */}
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
            animate={{ 
              backgroundColor: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Explosion at capture point */}
          <motion.div
            className="absolute pointer-events-none z-40"
            style={{ 
              left: position.x, 
              top: position.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Central flash */}
            <motion.div
              className="absolute rounded-full"
              style={{ 
                width: 60, 
                height: 60, 
                left: -30, 
                top: -30,
                background: `radial-gradient(circle, ${color.light} 0%, transparent 70%)`
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 2, 2.5], opacity: [1, 0.8, 0] }}
              transition={{ duration: 0.4 }}
            />

            {/* Impact ring */}
            <motion.div
              className="absolute rounded-full border-4"
              style={{ 
                width: 80, 
                height: 80, 
                left: -40, 
                top: -40,
                borderColor: color.main
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 1.5, 2], opacity: [1, 0.5, 0] }}
              transition={{ duration: 0.5 }}
            />

            {/* Explosion particles */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              return (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: i % 2 === 0 ? color.main : color.light,
                    left: -6,
                    top: -6
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * 50,
                    y: Math.sin(angle) * 50,
                    opacity: 0,
                    scale: 0.3
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              );
            })}

            {/* "CAPTURED!" text */}
            <motion.div
              className="absolute whitespace-nowrap font-bold text-sm"
              style={{ 
                left: '50%', 
                top: -40,
                color: color.main,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              initial={{ x: '-50%', y: 0, opacity: 0, scale: 0.5 }}
              animate={{ y: -20, opacity: [0, 1, 1, 0], scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              💥 CAPTURED!
            </motion.div>
          </motion.div>

          {/* Screen shake effect via CSS animation */}
          <motion.div
            className="fixed inset-0 pointer-events-none z-30"
            animate={{ 
              x: [0, -5, 5, -3, 3, 0],
              y: [0, 3, -3, 2, -2, 0]
            }}
            transition={{ duration: 0.3 }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default CaptureAnimation;
