import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const letters = "ProBattle".split("");

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1a1f2e]"
        >
          {/* ProBattle Text */}
          <div className="flex items-center mb-4">
            {letters.map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                  ease: "easeOut",
                }}
                className="text-5xl md:text-7xl font-display font-bold text-[#00d4ff]"
                style={{
                  textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>
          
          {/* READY • SET • DROP tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
            className="flex items-center gap-3 text-[#5a7a9a] text-sm md:text-base tracking-[0.3em] font-medium"
          >
            <span>READY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#5a7a9a]" />
            <span>SET</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#5a7a9a]" />
            <span>DROP</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
