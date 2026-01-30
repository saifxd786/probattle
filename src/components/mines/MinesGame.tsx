import { motion } from 'framer-motion';
import MinesGrid from './MinesGrid';
import MinesGamePanel from './MinesGamePanel';
import { useSecureMinesGame } from '@/hooks/useSecureMinesGame';

const MinesGame = () => {
  const {
    settings,
    gameState,
    walletBalance,
    isLoading,
    startGame,
    revealTile,
    cashOut,
    resetGame,
    setEntryAmount,
    setMinesCount
  } = useSecureMinesGame();

  const isGameOver = gameState.phase === 'result';
  const isPlaying = gameState.phase === 'playing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Game Grid - TOP */}
      <div>
        <MinesGrid
          minePositions={gameState.minePositions}
          revealedPositions={gameState.revealedPositions}
          isGameOver={isGameOver}
          onTileClick={revealTile}
          disabled={!isPlaying}
        />
        
        {/* Game Info */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span>Gems: {25 - gameState.minesCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Mines: {gameState.minesCount}</span>
          </div>
        </div>
      </div>

      {/* Game Panel - BOTTOM */}
      <div className="max-w-md mx-auto">
        <MinesGamePanel
          phase={gameState.phase}
          entryAmount={gameState.entryAmount}
          minesCount={gameState.minesCount}
          currentMultiplier={gameState.currentMultiplier}
          potentialWin={gameState.potentialWin}
          revealedCount={gameState.revealedPositions.length}
          walletBalance={walletBalance}
          minEntry={settings.minEntryAmount}
          minMines={settings.minMines}
          maxMines={settings.maxMines}
          onEntryChange={setEntryAmount}
          onMinesChange={setMinesCount}
          onStart={startGame}
          onCashOut={cashOut}
          onReset={resetGame}
          isWin={gameState.isWin}
          finalAmount={gameState.finalAmount}
        />
      </div>
    </motion.div>
  );
};

export default MinesGame;
