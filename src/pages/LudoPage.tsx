import { motion } from 'framer-motion';
import { Dices, Wallet, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import { Button } from '@/components/ui/button';
import EntrySelector from '@/components/ludo/EntrySelector';
import MatchmakingScreen from '@/components/ludo/MatchmakingScreen';
import LudoBoard from '@/components/ludo/LudoBoard';
import LudoDice from '@/components/ludo/LudoDice';
import GameResult from '@/components/ludo/GameResult';
import { useLudoGame } from '@/hooks/useLudoGame';
import { useAuth } from '@/contexts/AuthContext';

const LudoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    settings,
    gameState,
    entryAmount,
    setEntryAmount,
    playerMode,
    setPlayerMode,
    walletBalance,
    startMatchmaking,
    rollDice,
    handleTokenClick,
    resetGame,
    rewardAmount
  } = useLudoGame();

  const ENTRY_AMOUNTS = [100, 200, 500, 1000];

  if (!settings.isEnabled) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 pt-20 text-center">
          <Dices className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Ludo Coming Soon</h1>
          <p className="text-muted-foreground">This game is currently under maintenance.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Matchmaking Screen
  if (gameState.phase === 'matchmaking') {
    return (
      <MatchmakingScreen
        players={gameState.players.map(p => ({
          id: p.id,
          name: p.name,
          isBot: p.isBot,
          status: p.status,
          color: p.color
        }))}
        totalPlayers={playerMode}
        entryAmount={entryAmount}
        rewardAmount={rewardAmount}
      />
    );
  }

  // Game Board Screen
  if (gameState.phase === 'playing') {
    const currentPlayer = gameState.players[gameState.currentTurn];
    const isUserTurn = currentPlayer && !currentPlayer.isBot;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Game Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Current Turn</p>
              <p className="font-medium capitalize">{currentPlayer?.name}</p>
            </div>
            <div className="glass-card px-4 py-2 rounded-lg">
              <p className="text-xs text-muted-foreground">Prize</p>
              <p className="font-bold text-green-400">₹{rewardAmount}</p>
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="flex justify-around p-2 bg-card/50">
          {gameState.players.map((player, idx) => (
            <div
              key={player.id}
              className={`text-center px-2 py-1 rounded ${
                idx === gameState.currentTurn ? 'bg-primary/20 ring-2 ring-primary' : ''
              }`}
            >
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ 
                  backgroundColor: player.color === 'red' ? '#ef4444' :
                    player.color === 'green' ? '#22c55e' :
                    player.color === 'yellow' ? '#eab308' : '#3b82f6'
                }}
              />
              <p className="text-[10px] truncate max-w-[60px]">{player.name}</p>
              <p className="text-[8px] text-muted-foreground">{player.tokensHome}/4 home</p>
            </div>
          ))}
        </div>

        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <LudoBoard
            players={gameState.players.map((p, idx) => ({
              color: p.color,
              tokens: p.tokens,
              isCurrentTurn: idx === gameState.currentTurn
            }))}
            onTokenClick={isUserTurn && !gameState.canRoll ? handleTokenClick : undefined}
            selectedToken={gameState.selectedToken}
          />
        </div>

        {/* Dice Area */}
        <div className="p-6 border-t border-border bg-card/50">
          <LudoDice
            value={gameState.diceValue}
            isRolling={gameState.isRolling}
            onRoll={rollDice}
            disabled={!isUserTurn}
            canRoll={gameState.canRoll && isUserTurn}
          />
          {!isUserTurn && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Waiting for {currentPlayer?.name}...
            </p>
          )}
          {isUserTurn && !gameState.canRoll && !gameState.isRolling && (
            <p className="text-center text-sm text-primary mt-2">
              Tap a token to move it
            </p>
          )}
        </div>
      </div>
    );
  }

  // Result Screen
  if (gameState.phase === 'result' && gameState.winner) {
    const isUserWinner = gameState.winner.id === user?.id;
    
    return (
      <GameResult
        isWinner={isUserWinner}
        rewardAmount={rewardAmount}
        entryAmount={entryAmount}
        playerName={gameState.winner.name}
        onPlayAgain={() => {
          resetGame();
        }}
        onGoHome={() => {
          resetGame();
          navigate('/ludo');
        }}
      />
    );
  }

  // Home Screen
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4"
          >
            <Dices className="w-12 h-12 text-primary" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold mb-2">Ludo King</h1>
          <p className="text-muted-foreground">Play & Win Real Money</p>
        </motion.div>

        {/* Wallet Balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-xl mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Wallet Balance</p>
              <p className="font-bold text-lg">₹{walletBalance.toFixed(2)}</p>
            </div>
          </div>
          <Link to="/wallet">
            <Button variant="outline" size="sm">Add Money</Button>
          </Link>
        </motion.div>

        {/* Entry Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <EntrySelector
            amounts={ENTRY_AMOUNTS.filter(a => a >= settings.minEntryAmount)}
            selectedAmount={entryAmount}
            onSelect={setEntryAmount}
            rewardMultiplier={settings.rewardMultiplier}
            playerMode={playerMode}
            onPlayerModeChange={setPlayerMode}
          />
        </motion.div>

        {/* Play Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {user ? (
            <Button
              onClick={startMatchmaking}
              disabled={walletBalance < entryAmount}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90"
            >
              {walletBalance < entryAmount ? 'Insufficient Balance' : 'Play Now'}
            </Button>
          ) : (
            <Link to="/auth" className="block">
              <Button className="w-full py-6 text-lg font-bold">
                Login to Play
              </Button>
            </Link>
          )}
        </motion.div>

        {/* Rules Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <Link 
            to="/ludo/rules" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-4 h-4" />
            Game Rules & Fair Play
          </Link>
        </motion.div>
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default LudoPage;