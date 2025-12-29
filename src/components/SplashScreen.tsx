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
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cyber-grid"
      >
        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            animate={{
              top: ['0%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-5xl md:text-7xl font-bold text-gradient tracking-wider">
            ProScims
          </h1>
        </motion.div>

        {/* Terminal-style text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 font-mono text-sm text-primary/80"
        >
          <span className="inline-block animate-cyber-flicker">{'>'}</span>{' '}
          <span className="inline-block">{statusText}</span>
          <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
        </motion.div>

        {/* Loading bar container */}
        <div className="w-72 md:w-96">
          {/* Progress bar background */}
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden border border-primary/20">
            {/* Animated progress */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-blue to-neon-cyan rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
            
            {/* Glow effect */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-blue to-neon-cyan rounded-full blur-sm opacity-50"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress percentage */}
          <div className="flex justify-between mt-3 text-xs font-mono text-muted-foreground">
            <span>LOADING</span>
            <span className="text-primary">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Decorative corners */}
        <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-primary/30" />
        <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-primary/30" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-primary/30" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-primary/30" />

        {/* Grid dots */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
