import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle, ArrowRight, Volume2, VolumeX, RotateCcw, Coins, Zap, Home, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

interface GameResultProps {
  isWinner: boolean;
  rewardAmount: number;
  entryAmount: number;
  playerName: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
  showRematch?: boolean;
  onRematch?: () => void;
}

// Minimal confetti - Flat design
const MinimalConfetti = () => {
  const particles = useMemo(() => 
    Array.from({ length: 40 }).map((_, i) => {
      const colors = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'];
      return {
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2,
      };
    }), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: '100vh',
            opacity: [0, 1, 1, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}
    </div>
  );
};

// Floating coins - Simple version
const SimpleFloatingCoins = () => {
  const coins = useMemo(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: 10 + Math.random() * 80,
      delay: i * 0.2,
      duration: 3 + Math.random() * 2,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {coins.map((c) => (
        <motion.div
          key={c.id}
          className="absolute text-xl"
          style={{ left: `${c.left}%` }}
          initial={{ y: '100vh', opacity: 0 }}
          animate={{
            y: '-10vh',
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          🪙
        </motion.div>
      ))}
    </div>
  );
};

// Simple sparkle effect
const SimpleSparkles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${15 + Math.random() * 70}%`,
          top: `${15 + Math.random() * 70}%`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          delay: i * 0.3,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
      </motion.div>
    ))}
  </div>
);

const GameResult = ({ isWinner, rewardAmount, entryAmount, playerName, onPlayAgain, onGoHome, showRematch, onRematch }: GameResultProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 200);
    
    if (isWinner) {
      soundManager.playWin();
      hapticManager.gameWin();
    } else {
      soundManager.playLose();
      hapticManager.gameLose();
    }
    
    return () => clearTimeout(timer);
  }, [isWinner]);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.setEnabled(!soundEnabled);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden bg-[#0A0A0F]">
      {/* Subtle gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: isWinner 
            ? `radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
               radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
               #0A0A0F`
            : `radial-gradient(circle at 50% 50%, rgba(100, 100, 100, 0.08) 0%, transparent 50%),
               #0A0A0F`,
        }}
      />

      {/* Dot pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Winner effects */}
      {isWinner && <MinimalConfetti />}
      {isWinner && <SimpleFloatingCoins />}
      {isWinner && <SimpleSparkles />}
      
      {/* Sound toggle */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        onClick={toggleSound}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-gray-900/50 border border-gray-800 z-50"
      >
        {soundEnabled ? (
          <Volume2 className="w-5 h-5 text-gray-400" />
        ) : (
          <VolumeX className="w-5 h-5 text-gray-600" />
        )}
      </motion.button>

      {/* Winner banner */}
      {isWinner && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="absolute top-6 left-1/2 -translate-x-1/2"
        >
          <div 
            className="px-6 py-2 rounded-full text-sm font-bold tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            }}
          >
            <span className="text-white">🏆 CHAMPION</span>
          </div>
        </motion.div>
      )}
      
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full max-w-sm relative z-10"
          >
            {/* Result Card - Flat design */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
              
              {/* Result Icon Section */}
              <div className="pt-8 pb-6 text-center relative">
                {isWinner ? (
                  <motion.div 
                    className="inline-block relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    {/* Glow ring */}
                    <motion.div
                      className="absolute -inset-4 rounded-full"
                      style={{ 
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)' 
                      }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    {/* Trophy container */}
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                      style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      }}
                    >
                      <Trophy className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="inline-block"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center">
                      <XCircle className="w-10 h-10 text-gray-500" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Result Text */}
              <div className="text-center px-6 pb-4">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    "text-2xl font-bold mb-1",
                    isWinner ? "text-emerald-400" : "text-gray-400"
                  )}
                >
                  {isWinner ? 'VICTORY!' : 'GAME OVER'}
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-500 text-sm"
                >
                  {isWinner ? 'You dominated the board!' : 'Better luck next time!'}
                </motion.p>
              </div>

              {/* Reward Card */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mx-6 mb-5"
              >
                <div
                  className={cn(
                    "p-4 rounded-xl border text-center",
                    isWinner 
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Coins className={cn("w-6 h-6", isWinner ? "text-amber-400" : "text-red-400")} />
                    <span 
                      className={cn(
                        "text-3xl font-bold",
                        isWinner ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {isWinner ? '+' : '-'}₹{isWinner ? rewardAmount : entryAmount}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1.5">
                    {isWinner ? 'Added to your wallet' : 'Entry fee deducted'}
                  </p>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mx-6 mb-5 grid grid-cols-3 gap-2"
              >
                {[
                  { icon: Target, label: 'Entry', value: `₹${entryAmount}` },
                  { icon: Trophy, label: 'Prize', value: `₹${rewardAmount}` },
                  { icon: Zap, label: 'Multiplier', value: '1.5x' },
                ].map((stat, idx) => (
                  <div
                    key={stat.label}
                    className="bg-gray-800/50 rounded-xl p-3 text-center"
                  >
                    <stat.icon className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                    <p className="text-xs font-semibold text-white">{stat.value}</p>
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-6 pt-0 space-y-2.5"
              >
                {showRematch && onRematch ? (
                  <motion.button
                    onClick={() => {
                      soundManager.playClick();
                      hapticManager.buttonTap();
                      onRematch();
                    }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    REMATCH
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() => {
                      soundManager.playClick();
                      hapticManager.buttonTap();
                      onPlayAgain();
                    }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                    style={{
                      background: isWinner 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    PLAY AGAIN
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
                
                <motion.button
                  onClick={() => {
                    soundManager.playClick();
                    hapticManager.buttonTap();
                    onGoHome();
                  }}
                  className="w-full py-3.5 rounded-xl font-medium text-sm text-gray-400 bg-gray-800/50 border border-gray-700/50 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Home className="w-4 h-4" />
                  Back to Home
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameResult;
