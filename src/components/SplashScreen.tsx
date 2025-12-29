import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing ProScims...');

  useEffect(() => {
    const statuses = [
      'Initializing ProScims...',
      'Loading game modules...',
      'Connecting to servers...',
      'Preparing battlefield...',
      'System ready.',
    ];

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 15 + 5;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        
        const statusIndex = Math.min(
          Math.floor(newProgress / 25),
          statuses.length - 1
        );
        setStatusText(statuses[statusIndex]);
        
        return newProgress;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-card"
      >
        {/* Logo / brand animation */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mb-6 text-center"
        >
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider neon-text">
            {'ProScims'.split('').map((ch, i) => (
              <motion.span
                key={`${ch}-${i}`}
                className="inline-block"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-2 text-xs md:text-sm text-muted-foreground tracking-[0.35em] uppercase"
          >
            Ready • Set • Drop
          </motion.p>
        </motion.div>

        {/* Loading bar container */}
        <div className="w-72 md:w-96">
          {/* Progress bar background */}
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden border border-border">
            {/* Animated progress */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />

            {/* Glow effect */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full blur-sm opacity-40"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress / status */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-muted-foreground">{statusText}</span>
            <span className="text-primary font-display">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Subtle floating particles (gaming vibe, not "hacker") */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {[...Array(18)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 100}%` }}
              animate={{ opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: (i % 6) * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
