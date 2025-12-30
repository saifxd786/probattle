import { motion } from 'framer-motion';
import { Trophy, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameResultProps {
  isWinner: boolean;
  rewardAmount: number;
  entryAmount: number;
  playerName: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

const Confetti = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 50 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-3 h-3"
        style={{
          left: `${Math.random() * 100}%`,
          backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]
        }}
        initial={{ y: -20, opacity: 1, rotate: 0 }}
        animate={{
          y: '100vh',
          opacity: 0,
          rotate: Math.random() * 360
        }}
        transition={{
          duration: 2 + Math.random() * 2,
          delay: Math.random() * 0.5,
          repeat: Infinity,
          repeatDelay: Math.random() * 2
        }}
      />
    ))}
  </div>
);

const GameResult = ({ isWinner, rewardAmount, entryAmount, playerName, onPlayAgain, onGoHome }: GameResultProps) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      {isWinner && <Confetti />}
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-full max-w-sm"
      >
        {/* Result Icon */}
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-center mb-6"
        >
          {isWinner ? (
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-flex p-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-2xl"
            >
              <Trophy className="w-16 h-16 text-white" />
            </motion.div>
          ) : (
            <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 shadow-xl">
              <XCircle className="w-16 h-16 text-gray-300" />
            </div>
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
            {isWinner ? 'Victory!' : 'Defeated'}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-4"
          >
            {isWinner 
              ? 'Congratulations! You won the match!' 
              : 'Better luck next time!'}
          </motion.p>

          {/* Reward Display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className={cn(
              'glass-card p-6 rounded-2xl inline-block',
              isWinner && 'border-2 border-yellow-500/30'
            )}
          >
            {isWinner ? (
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-3xl font-bold text-green-400">+₹{rewardAmount}</span>
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
            ) : (
              <span className="text-2xl font-bold text-red-400">-₹{entryAmount}</span>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {isWinner ? 'Added to wallet' : 'Entry fee'}
            </p>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Button
            onClick={onPlayAgain}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
          >
            Play Again
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <Button
            onClick={onGoHome}
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