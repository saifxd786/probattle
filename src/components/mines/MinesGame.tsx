import { motion } from 'framer-motion';
import MinesGrid from './MinesGrid';
import MinesGamePanel from './MinesGamePanel';
import { useMinesGame } from '@/hooks/useMinesGame';

const MinesGame = () => {
  const {
    settings,
    gameState,
    walletBalance,
    startGame,
    revealTile,
    cashOut,
    resetGame,
    setEntryAmount,
    setMinesCount
  } = useMinesGame();

  const isGameOver = gameState.phase === 'result';
  const isPlaying = gameState.phase === 'playing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid md:grid-cols-[1fr_320px] gap-6"
    >
      {/* Game Grid */}
      <div className="order-2 md:order-1">
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

      {/* Game Panel */}
      <div className="order-1 md:order-2">
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
