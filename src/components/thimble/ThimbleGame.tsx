import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Eye, Shuffle, Target, Trophy, X, RotateCcw, ArrowLeft, Play, Clock, Zap, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThimbleCups from './ThimbleCups';
import ThimbleEntrySelector from './ThimbleEntrySelector';
import { useThimbleGame, ThimbleDifficulty } from '@/hooks/useThimbleGame';
import { cn } from '@/lib/utils';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { createPortal } from 'react-dom';

const ThimbleGame = () => {
  const {
    settings,
    gameState,
    walletBalance,
    selectedDifficulty,
    setSelectedDifficulty,
    proceedToModeSelect,
    startGame,
    handleSelection,
    resetGame,
    setEntryAmount,
    setCupPositions,
    rewardAmount,
    getDifficultySettings
  } = useThimbleGame();

  const diffSettings = getDifficultySettings(selectedDifficulty);

  const difficulties: { id: ThimbleDifficulty; label: string; icon: typeof Clock; time: number; multiplier: number; color: string; bgColor: string; borderColor: string }[] = [
    {
      id: 'easy',
      label: 'Easy',
      icon: Clock,
      time: settings.selectionTimeEasy,
      multiplier: settings.rewardMultiplierEasy,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      id: 'hard',
      label: 'Normal',
      icon: Zap,
      time: settings.selectionTimeHard,
      multiplier: settings.rewardMultiplierHard,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      id: 'impossible',
      label: 'Hard',
      icon: Flame,
      time: settings.selectionTimeImpossible,
      multiplier: settings.rewardMultiplierImpossible,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
  ];

  const renderPhaseIndicator = () => {
    const phases = [
      { phase: 'showing', icon: Eye, label: 'Watch the Ball' },
      { phase: 'shuffling', icon: Shuffle, label: 'Shuffling...' },
      { phase: 'selecting', icon: Target, label: 'Pick a Cup!' }
    ];

    const currentPhaseInfo = phases.find(p => p.phase === gameState.phase);

    if (!currentPhaseInfo || gameState.phase === 'idle' || gameState.phase === 'mode-select' || gameState.phase === 'result') {
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
    const ballCupNumber = (() => {
      const idx = gameState.cupPositions?.indexOf(gameState.ballPosition) ?? -1;
      return idx >= 0 ? idx + 1 : gameState.ballPosition + 1;
    })();

    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {isWin && <ConfettiCelebration isActive={true} />}
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`glass-card p-8 max-w-sm w-full text-center border-2 relative z-10 ${
              isWin ? 'border-green-500/50' : 'border-red-500/50'
            }`}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
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
                +₹{Math.floor(rewardAmount)}
              </motion.p>
            ) : (
              <p className="text-muted-foreground mb-6">
                The ball was under cup {ballCupNumber}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={resetGame}
                size="lg"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
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
        {gameState.phase === 'idle' && (
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
              onSelectAmount={setEntryAmount}
              onProceed={proceedToModeSelect}
            />
          </motion.div>
        )}

        {gameState.phase === 'mode-select' && (
          <motion.div
            key="mode-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetGame}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {/* Entry amount display */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Entry Amount</p>
              <p className="text-2xl font-bold">₹{gameState.entryAmount}</p>
            </div>

            {/* Mode selector */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground text-center">
                Choose Difficulty
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map((diff) => {
                  const Icon = diff.icon;
                  const isSelected = selectedDifficulty === diff.id;
                  const potentialWin = Math.floor(gameState.entryAmount * diff.multiplier);

                  return (
                    <motion.button
                      key={diff.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={cn(
                        'relative p-4 rounded-xl border-2 transition-all duration-200',
                        diff.bgColor,
                        isSelected 
                          ? `${diff.borderColor} ring-2 ring-offset-2 ring-offset-background` 
                          : 'border-transparent hover:border-border',
                        isSelected && diff.id === 'easy' && 'ring-green-500/50',
                        isSelected && diff.id === 'hard' && 'ring-yellow-500/50',
                        isSelected && diff.id === 'impossible' && 'ring-red-500/50'
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Icon className={cn('w-6 h-6', diff.color)} />
                        <span className={cn('font-semibold text-sm', diff.color)}>
                          {diff.label}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {diff.time}s • {diff.multiplier}x
                        </div>
                        <div className={cn('text-sm font-bold', diff.color)}>
                          Win ₹{potentialWin}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Play button */}
            <Button
              onClick={startGame}
              size="lg"
              className="w-full gap-2 text-lg py-6"
            >
              <Play className="w-5 h-5" />
              Start Game
            </Button>
          </motion.div>
        )}

        {(gameState.phase === 'showing' || gameState.phase === 'shuffling' || gameState.phase === 'selecting' || gameState.phase === 'revealing') && (
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
              <p className="text-xs text-muted-foreground">Win ₹{Math.floor(rewardAmount)}</p>
            </motion.div>

            {renderPhaseIndicator()}
            
            <ThimbleCups
              phase={gameState.phase as 'showing' | 'shuffling' | 'selecting' | 'revealing' | 'result'}
              ballPosition={gameState.ballPosition}
              selectedCup={gameState.selectedCup}
              isWin={gameState.isWin}
              difficulty={selectedDifficulty}
              shuffleDuration={diffSettings.shuffleDuration}
              onSelectCup={handleSelection}
              onCupOrderChange={setCupPositions}
            />

            {/* Revealing phase text */}
            {gameState.phase === 'revealing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-6"
              >
                <p className={`text-xl font-bold ${gameState.isWin ? 'text-green-400' : 'text-red-400'}`}>
                  {gameState.isWin ? '🎉 Correct!' : '😔 Wrong Cup!'}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {renderResult()}
    </div>
  );
};

export default ThimbleGame;