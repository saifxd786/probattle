import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Eye, Shuffle, Target, Trophy, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThimbleCups from './ThimbleCups';
import ThimbleEntrySelector from './ThimbleEntrySelector';
import { useThimbleGame } from '@/hooks/useThimbleGame';

const ThimbleGame = () => {
  const {
    settings,
    gameState,
    walletBalance,
    startGame,
    handleSelection,
    resetGame,
    setEntryAmount,
    rewardAmount
  } = useThimbleGame();

  const renderPhaseIndicator = () => {
    const phases = [
      { phase: 'showing', icon: Eye, label: 'Watch the Ball' },
      { phase: 'shuffling', icon: Shuffle, label: 'Shuffling...' },
      { phase: 'selecting', icon: Target, label: 'Pick a Cup!' }
    ];

    const currentPhaseInfo = phases.find(p => p.phase === gameState.phase);

    if (!currentPhaseInfo || gameState.phase === 'idle' || gameState.phase === 'result') {
      return null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 mb-6"
      >
        <div className="p-2 rounded-lg bg-primary/20 animate-pulse">
          <currentPhaseInfo.icon className="w-5 h-5 text-primary" />
        </div>
        <span className="font-display text-lg font-bold text-foreground">
          {currentPhaseInfo.label}
        </span>
        
        {gameState.phase === 'selecting' && (
          <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-destructive/20 border border-destructive/30">
            <Timer className="w-4 h-4 text-destructive" />
            <span className="font-display font-bold text-destructive">{gameState.timeLeft}s</span>
          </div>
        )}
      </motion.div>
    );
  };

  const renderResult = () => {
    if (gameState.phase !== 'result') return null;

    const isWin = gameState.isWin;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className={`glass-card p-8 max-w-sm w-full text-center border-2 ${
            isWin ? 'border-green-500/50' : 'border-red-500/50'
          }`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: isWin ? [0, 10, -10, 0] : 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isWin 
                ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }`}
          >
            {isWin ? (
              <Trophy className="w-10 h-10 text-white" />
            ) : (
              <X className="w-10 h-10 text-white" />
            )}
          </motion.div>

          <h2 className={`font-display text-3xl font-bold mb-2 ${
            isWin ? 'text-green-400' : 'text-red-400'
          }`}>
            {isWin ? 'YOU WON!' : 'WRONG CUP!'}
          </h2>

          {isWin ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-display font-bold text-gradient mb-6"
            >
              +₹{rewardAmount.toFixed(0)}
            </motion.p>
          ) : (
            <p className="text-muted-foreground mb-6">
              The ball was under cup {gameState.ballPosition + 1}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetGame}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (!settings.isEnabled) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Thimble Game is currently disabled</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px]">
      
      <AnimatePresence mode="wait">
        {gameState.phase === 'idle' ? (
          <motion.div
            key="entry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ThimbleEntrySelector
              minAmount={settings.minEntryAmount}
              selectedAmount={gameState.entryAmount}
              walletBalance={walletBalance}
              rewardMultiplier={settings.rewardMultiplier}
              onSelectAmount={setEntryAmount}
              onStartGame={() => startGame(gameState.entryAmount)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-16"
          >
            {/* Entry amount display */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <p className="text-sm text-muted-foreground">Playing for</p>
              <p className="font-display text-2xl font-bold text-primary">₹{gameState.entryAmount}</p>
              <p className="text-xs text-muted-foreground">Win ₹{rewardAmount.toFixed(0)}</p>
            </motion.div>

            {renderPhaseIndicator()}
            
            <ThimbleCups
              phase={gameState.phase as 'showing' | 'shuffling' | 'selecting' | 'result'}
              ballPosition={gameState.ballPosition}
              selectedCup={gameState.selectedCup}
              isWin={gameState.isWin}
              difficulty={settings.difficulty}
              shuffleDuration={settings.shuffleDuration}
              onSelectCup={handleSelection}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {renderResult()}
    </div>
  );
};

export default ThimbleGame;
