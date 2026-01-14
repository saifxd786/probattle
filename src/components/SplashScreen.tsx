import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'loading' | 'complete'>('logo');

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('loading'), 800);
    const timer2 = setTimeout(() => setPhase('complete'), 2500);
    const timer3 = setTimeout(() => onComplete(), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(220 50% 8%) 0%, hsl(220 30% 3%) 100%)',
          }}
        >
          {/* Cyber Grid Background */}
          <div className="absolute inset-0 cyber-grid opacity-30" />
          
          {/* Animated Glow Circles */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: [0, 0.5, 0.3] }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(200 100% 50% / 0.3) 0%, transparent 70%)',
            }}
          />
          
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0.8], opacity: [0, 0.4, 0.2] }}
            transition={{ duration: 1.8, delay: 0.2, ease: 'easeOut' }}
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(185 100% 50% / 0.3) 0%, transparent 70%)',
            }}
          />

          {/* Logo Container */}
          <motion.div
            initial={{ scale: 0, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 200,
              damping: 20,
              duration: 0.8 
            }}
            className="relative z-10 mb-8"
          >
            {/* Logo Glow Effect */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 20px hsl(200 100% 50% / 0.5)',
                  '0 0 40px hsl(200 100% 50% / 0.8)',
                  '0 0 20px hsl(200 100% 50% / 0.5)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-display font-black text-white"
              >
                P
              </motion.span>
            </motion.div>
          </motion.div>

          {/* Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative z-10 text-center"
          >
            <h1 className="font-display text-4xl font-bold tracking-wider mb-2">
              <span className="text-gradient">ProBattle</span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground text-sm tracking-widest uppercase"
            >
              Compete • Win • Dominate
            </motion.p>
          </motion.div>

          {/* Loading Bar */}
          {phase === 'loading' && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '200px' }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-20 h-1 bg-secondary/30 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, hsl(200 100% 50%), hsl(185 100% 50%))',
                }}
              />
            </motion.div>
          )}

          {/* Scanning Line Effect */}
          <motion.div
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 right-0 h-[2px] opacity-50"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(200 100% 50%), transparent)',
            }}
          />

          {/* Corner Decorations */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/50" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/50" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/50" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/50" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
