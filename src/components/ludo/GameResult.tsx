import { motion } from 'framer-motion';
import { Trophy, XCircle, Sparkles, ArrowRight, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
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

// Confetti particles
const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 80 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${Math.random() * 100}%`,
          width: Math.random() * 10 + 5,
          height: Math.random() * 10 + 5,
          backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF69B4', '#00CED1', '#FF4500', '#32CD32'][Math.floor(Math.random() * 9)],
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        }}
        initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
        animate={{
          y: '120vh',
          opacity: [1, 1, 0.8, 0],
          rotate: Math.random() * 1080 - 540,
          scale: [1, 1.3, 0.6],
          x: [0, (Math.random() - 0.5) * 100],
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          delay: Math.random() * 0.8,
          repeat: Infinity,
          repeatDelay: Math.random() * 2,
          ease: 'easeOut'
        }}
      />
    ))}
  </div>
);

// Floating coins animation
const FloatingCoins = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-3xl"
        style={{ left: `${5 + Math.random() * 90}%` }}
        initial={{ y: '100vh', opacity: 0, rotate: 0 }}
        animate={{
          y: '-20vh',
          opacity: [0, 1, 1, 0],
          rotate: [0, 360, 720],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 2.5 + Math.random() * 1.5,
          delay: i * 0.15,
          repeat: Infinity,
          repeatDelay: 1.5,
        }}
      >
        💰
      </motion.div>
    ))}
  </div>
);

// Firework burst effect
const Fireworks = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 5 }).map((_, burstIdx) => (
      <motion.div
        key={burstIdx}
        className="absolute"
        style={{
          left: `${15 + burstIdx * 18}%`,
          top: `${20 + Math.random() * 30}%`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
        transition={{
          duration: 1.5,
          delay: burstIdx * 0.4,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        {Array.from({ length: 12 }).map((_, sparkIdx) => (
          <motion.div
            key={sparkIdx}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF69B4', '#00FF00'][Math.floor(Math.random() * 5)],
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos((sparkIdx * 30 * Math.PI) / 180) * 60,
              y: Math.sin((sparkIdx * 30 * Math.PI) / 180) * 60,
              opacity: [1, 1, 0],
              scale: [1, 0.5, 0],
            }}
            transition={{
              duration: 0.8,
              delay: burstIdx * 0.4,
              repeat: Infinity,
              repeatDelay: 2 + 0.7,
            }}
          />
        ))}
      </motion.div>
    ))}
  </div>
);

// Star burst effect
const StarBurst = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 15 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-2xl"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        initial={{ scale: 0, opacity: 0, rotate: 0 }}
        animate={{
          scale: [0, 1.2, 0],
          opacity: [0, 1, 0],
          rotate: [0, 180],
        }}
        transition={{
          duration: 1,
          delay: i * 0.2,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        ⭐
      </motion.div>
    ))}
  </div>
);

const GameResult = ({ isWinner, rewardAmount, entryAmount, playerName, onPlayAgain, onGoHome, showRematch, onRematch }: GameResultProps) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // Play result sound and haptic
    if (isWinner) {
      soundManager.playWin();
      hapticManager.gameWin();
    } else {
      soundManager.playLose();
      hapticManager.gameLose();
    }
  }, [isWinner]);

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    soundManager.setEnabled(!soundEnabled);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      {isWinner && <Confetti />}
      {isWinner && <FloatingCoins />}
      {isWinner && <Fireworks />}
      {isWinner && <StarBurst />}
      
      {/* Sound toggle */}
      <button
        onClick={toggleSound}
        className="absolute top-4 right-4 p-2 rounded-full bg-card/50 hover:bg-card transition-colors"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-full max-w-sm"
      >
        {/* Result Icon */}
        <motion.div
          initial={{ y: -100, rotate: -20 }}
          animate={{ y: 0, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
          className="text-center mb-6"
        >
          {isWinner ? (
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, -5, 0],
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex p-6 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 shadow-2xl relative"
            >
              <Trophy className="w-16 h-16 text-white drop-shadow-lg" />
              {/* Sparkle effects */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                >
                  <Sparkles className="w-4 h-4 text-yellow-200" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              className="inline-flex p-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 shadow-xl"
              animate={{ scale: [1, 0.95, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <XCircle className="w-16 h-16 text-gray-300" />
            </motion.div>
          )}
        </motion.div>

        {/* Result Text */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              'font-display text-4xl font-bold mb-2',
              isWinner ? 'text-gradient' : 'text-gray-400'
            )}
          >
            {isWinner ? '🎉 Victory! 🎉' : 'Game Over'}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-4"
          >
            {isWinner 
              ? 'Congratulations! You dominated the board!' 
              : 'Better luck next time!'}
          </motion.p>

          {/* Reward Display */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className={cn(
              'glass-card p-6 rounded-2xl inline-block relative overflow-hidden',
              isWinner && 'border-2 border-yellow-500/50'
            )}
          >
            {isWinner && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
            {isWinner ? (
              <div className="flex items-center gap-2 relative">
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.span>
                <motion.span 
                  className="text-4xl font-bold text-green-400"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  +₹{rewardAmount}
                </motion.span>
                <motion.span
                  animate={{ rotate: [0, -15, 15, 0] }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-red-400">-₹{entryAmount}</span>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {isWinner ? 'Added to your wallet! 💰' : 'Entry fee deducted'}
            </p>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          {showRematch && onRematch ? (
            <Button
              onClick={() => {
                soundManager.playClick();
                hapticManager.buttonTap();
                onRematch();
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-semibold py-6 shadow-lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Rematch
            </Button>
          ) : (
            <Button
              onClick={() => {
                soundManager.playClick();
                hapticManager.buttonTap();
                onPlayAgain();
              }}
              className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 text-primary-foreground font-semibold py-6 shadow-lg"
            >
              Play Again
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          <Button
            onClick={() => {
              soundManager.playClick();
              hapticManager.buttonTap();
              onGoHome();
            }}
            variant="outline"
            className="w-full py-6"
          >
            Back to Home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default GameResult;