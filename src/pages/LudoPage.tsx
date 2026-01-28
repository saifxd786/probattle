import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dices, Wallet, Info, Trophy, Users, Zap, Ban, UserPlus, WifiOff, Wifi, RefreshCw, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import PullToRefresh from '@/components/PullToRefresh';
import { Button } from '@/components/ui/button';
import EntrySelector from '@/components/ludo/EntrySelector';
import MatchmakingScreen from '@/components/ludo/MatchmakingScreen';
import LudoBoard from '@/components/ludo/LudoBoard';
import LudoDice from '@/components/ludo/LudoDice';
import GameResult from '@/components/ludo/GameResult';
import FriendMultiplayer from '@/components/ludo/FriendMultiplayer';
import SoundToggle from '@/components/ludo/SoundToggle';
import LudoChat from '@/components/ludo/LudoChat';
import CaptureAnimation from '@/components/ludo/CaptureAnimation';
import RematchDialog from '@/components/ludo/RematchDialog';
import { useLudoGame } from '@/hooks/useLudoGame';
import { useFriendLudoGame } from '@/hooks/useFriendLudoGame';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useGameBan } from '@/hooks/useGameBan';

type GameMode = 'select' | 'vs-bot' | 'vs-friend';

const LudoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleRefresh } = usePullToRefresh();
  const { isBanned, isLoading: isBanLoading } = useGameBan('ludo');
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [showRematchDialog, setShowRematchDialog] = useState(false);
  
  // Bot game hook
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
  
  // Friend multiplayer hook
  const {
    gameState: friendGameState,
    walletBalance: friendWalletBalance,
    opponentOnline,
    startRoom,
    rollDice: friendRollDice,
    handleTokenClick: friendHandleTokenClick,
    resetGame: friendResetGame,
    sendChatMessage,
    clearCaptureAnimation,
    resyncGameState,
    requestRematch,
    respondToRematch
  } = useFriendLudoGame();

  const ENTRY_AMOUNTS = [100, 200, 500, 1000];

  // Show banned message
  if (isBanned && !isBanLoading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-background pb-20">
          <Header />
          <main className="container mx-auto px-4 pt-20 text-center">
            <div className="glass-card p-8 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <Ban className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2 text-destructive">Access Restricted</h1>
              <p className="text-muted-foreground mb-4">
                You have been banned from playing Ludo. Please contact support if you believe this is an error.
              </p>
              <Link to="/" className="text-primary hover:underline text-sm">
                ← Back to Home
              </Link>
            </div>
          </main>
          <BottomNav />
        </div>
      </PullToRefresh>
    );
  }

  if (!settings.isEnabled) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-background pb-20">
          <Header />
          <main className="container mx-auto px-4 pt-20 text-center">
            <Dices className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Ludo Coming Soon</h1>
            <p className="text-muted-foreground">This game is currently under maintenance.</p>
          </main>
          <BottomNav />
        </div>
      </PullToRefresh>
    );
  }

  // Matchmaking Screen
  if (gameState.phase === 'matchmaking') {
    return (
      <MatchmakingScreen
        players={gameState.players.map(p => ({
          id: p.id,
          name: p.name,
          uid: p.uid,
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

  // Game Board Screen - Ludo King Style (Mobile Optimized)
  if (gameState.phase === 'playing') {
    const currentPlayer = gameState.players[gameState.currentTurn];
    const isUserTurn = currentPlayer && !currentPlayer.isBot;
    const colorStyles: Record<string, string> = {
      red: 'from-red-600 to-red-800',
      green: 'from-green-600 to-green-800',
      yellow: 'from-yellow-500 to-yellow-700',
      blue: 'from-blue-600 to-blue-800'
    };

    return (
      <div 
        className="min-h-screen flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
        }}
      >
        {/* Compact Game Header with Sound Toggle */}
        <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${colorStyles[currentPlayer?.color || 'red']} flex items-center justify-center`}
            >
              <span className="text-white text-[10px] font-bold">
                {currentPlayer?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-[8px] text-gray-400 uppercase tracking-wide">Turn</p>
              <p className="font-medium text-white text-xs">{currentPlayer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle compact />
            <motion.div 
              className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-[8px] text-yellow-500 uppercase tracking-wide">Prize</p>
              <p className="font-bold text-sm text-yellow-400">₹{rewardAmount}</p>
            </motion.div>
          </div>
        </div>

        {/* Compact Players Status Bar with UID */}
        <div className="shrink-0 flex justify-around py-1.5 px-2 bg-black/30">
          {gameState.players.map((player, idx) => (
            <motion.div
              key={player.id}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                idx === gameState.currentTurn 
                  ? 'bg-white/10 ring-1 ring-white/30' 
                  : 'opacity-60'
              }`}
              animate={idx === gameState.currentTurn ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-gradient-to-br ${colorStyles[player.color]} border border-white/30`}
              />
              <div>
                <p className="text-[8px] text-white font-medium">#{player.uid || '00000'}</p>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        i < player.tokensHome ? 'bg-green-400' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Game Board - Takes maximum space */}
        <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
          <LudoBoard
            players={gameState.players.map((p, idx) => ({
              color: p.color,
              tokens: p.tokens,
              isCurrentTurn: idx === gameState.currentTurn,
              name: p.name,
              uid: p.uid,
              isBot: p.isBot
            }))}
            onTokenClick={isUserTurn && !gameState.canRoll ? handleTokenClick : undefined}
            selectedToken={gameState.selectedToken}
          />
        </div>

        {/* Compact Dice Area */}
        <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-black/40">
          <LudoDice
            value={gameState.diceValue}
            isRolling={gameState.isRolling}
            onRoll={rollDice}
            disabled={!isUserTurn}
            canRoll={gameState.canRoll && isUserTurn}
            compact
          />
          
          <AnimatedStatus isUserTurn={isUserTurn} canRoll={gameState.canRoll} isRolling={gameState.isRolling} playerName={currentPlayer?.name || ''} />
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

  // Friend Multiplayer - Game in progress
  if (gameMode === 'vs-friend' && friendGameState.phase === 'playing') {
    const currentPlayer = friendGameState.players[friendGameState.currentTurn];
    const isUserTurn = currentPlayer && currentPlayer.id === user?.id;
    const colorStyles: Record<string, string> = {
      red: 'from-red-600 to-red-800',
      green: 'from-green-600 to-green-800',
      yellow: 'from-yellow-500 to-yellow-700',
      blue: 'from-blue-600 to-blue-800'
    };

    return (
      <div 
        className="min-h-screen flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
        }}
      >
        {/* Game Header */}
        <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${colorStyles[currentPlayer?.color || 'red']} flex items-center justify-center`}
            >
              <span className="text-white text-[10px] font-bold">
                {currentPlayer?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-[8px] text-gray-400 uppercase tracking-wide">Turn</p>
              <p className="font-medium text-white text-xs">{currentPlayer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Opponent Online Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${opponentOnline ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {opponentOnline ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-[10px] ${opponentOnline ? 'text-green-400' : 'text-red-400'}`}>
                {opponentOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {/* Resync Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resyncGameState}
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-white"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Sync
            </Button>
            <SoundToggle compact />
            <motion.div 
              className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-[8px] text-yellow-500 uppercase tracking-wide">Prize</p>
              <p className="font-bold text-sm text-yellow-400">₹{friendGameState.rewardAmount}</p>
            </motion.div>
          </div>
        </div>

        {/* Players Status Bar with UID */}
        <div className="shrink-0 flex justify-around py-1.5 px-2 bg-black/30">
          {friendGameState.players.map((player, idx) => (
            <motion.div
              key={player.id}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                idx === friendGameState.currentTurn 
                  ? 'bg-white/10 ring-1 ring-white/30' 
                  : 'opacity-60'
              }`}
              animate={idx === friendGameState.currentTurn ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-gradient-to-br ${colorStyles[player.color]} border border-white/30`}
              />
              <div>
                <p className="text-[8px] text-white font-medium">
                  #{player.uid || '00000'} {player.id === user?.id && '(You)'}
                </p>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        i < player.tokensHome ? 'bg-green-400' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
          <LudoBoard
            players={friendGameState.players.map((p, idx) => ({
              color: p.color,
              tokens: p.tokens,
              isCurrentTurn: idx === friendGameState.currentTurn,
              name: p.name,
              uid: p.uid,
              isBot: false
            }))}
            onTokenClick={isUserTurn && !friendGameState.canRoll ? friendHandleTokenClick : undefined}
            selectedToken={friendGameState.selectedToken}
          />
        </div>

        {/* Dice Area */}
        <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-black/40">
          <LudoDice
            value={friendGameState.diceValue}
            isRolling={friendGameState.isRolling}
            onRoll={friendRollDice}
            disabled={!isUserTurn}
            canRoll={friendGameState.canRoll && isUserTurn}
            compact
          />
          
          <AnimatedStatus 
            isUserTurn={isUserTurn} 
            canRoll={friendGameState.canRoll} 
            isRolling={friendGameState.isRolling} 
            playerName={currentPlayer?.name || ''} 
          />
        </div>

        {/* In-Game Chat */}
        {user && (
          <LudoChat
            messages={friendGameState.chatMessages}
            onSendMessage={sendChatMessage}
            currentUserId={user.id}
            playerColor={friendGameState.players.find(p => p.id === user.id)?.color || 'red'}
          />
        )}

        {/* Capture Animation */}
        {friendGameState.captureAnimation && (
          <CaptureAnimation
            isActive={friendGameState.captureAnimation.isActive}
            position={friendGameState.captureAnimation.position}
            capturedColor={friendGameState.captureAnimation.capturedColor}
            onComplete={clearCaptureAnimation}
          />
        )}
      </div>
    );
  }

  // Friend Multiplayer - Result Screen
  if (gameMode === 'vs-friend' && friendGameState.phase === 'result' && friendGameState.winner) {
    const isUserWinner = friendGameState.winner.id === user?.id;
    const opponentPlayer = friendGameState.players.find(p => p.id !== user?.id);

    return (
      <>
        <GameResult
          isWinner={isUserWinner}
          rewardAmount={friendGameState.rewardAmount}
          entryAmount={friendGameState.entryAmount}
          playerName={friendGameState.winner.name}
          onPlayAgain={() => {
            setShowRematchDialog(true);
          }}
          onGoHome={() => {
            friendResetGame();
            setGameMode('select');
          }}
          showRematch={true}
          onRematch={() => setShowRematchDialog(true)}
        />

        {/* Rematch Dialog */}
        <RematchDialog
          isOpen={showRematchDialog}
          onClose={() => setShowRematchDialog(false)}
          onAccept={() => {
            if (friendGameState.rematchStatus === 'idle') {
              requestRematch();
            } else if (friendGameState.rematchStatus === 'pending' && friendGameState.rematchRequester !== user?.id) {
              respondToRematch(true);
            }
          }}
          onDecline={() => {
            if (friendGameState.rematchStatus === 'pending') {
              respondToRematch(false);
            }
            setShowRematchDialog(false);
          }}
          entryAmount={friendGameState.entryAmount}
          opponentName={opponentPlayer?.name || 'Opponent'}
          isRequester={friendGameState.rematchRequester === user?.id}
          rematchStatus={friendGameState.rematchStatus}
        />
      </>
    );
  }

  // Friend Multiplayer Lobby Screen
  if (gameMode === 'vs-friend') {
    return (
      <div 
        className="min-h-screen"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
        }}
      >
        <FriendMultiplayer
          entryAmount={entryAmount}
          walletBalance={walletBalance}
          onRoomCreated={(roomId, roomCode, isHost, entryAmt, rewardAmt) => {
            startRoom(roomId, roomCode, isHost, entryAmt, rewardAmt);
          }}
          onBack={() => {
            friendResetGame();
            setGameMode('select');
          }}
        />
      </div>
    );
  }

  // Home Screen - Ludo King Style (Compact)
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div 
        className="min-h-screen pb-20"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
        }}
      >
        <Header />
        
        <main className="container mx-auto px-3 pt-16">
          {/* Compact Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            <motion.div
              className="inline-flex relative mb-2"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div 
                className="p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(145deg, #FFD700 0%, #FFA500 100%)',
                  boxShadow: '0 6px 20px rgba(255,165,0,0.3)',
                }}
              >
                <Dices className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-white">
              <span className="text-gradient">Ludo King</span>
            </h1>
            <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              Play & Win Real Cash
            </p>
          </motion.div>

          {/* Compact Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-2 mb-4"
          >
            <div className="text-center p-2 rounded-lg bg-white/5 border border-white/10">
              <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
              <p className="text-sm font-bold text-white">10K+</p>
              <p className="text-[8px] text-gray-500">Winners</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/5 border border-white/10">
              <Users className="w-4 h-4 text-green-500 mx-auto" />
              <p className="text-sm font-bold text-white">5K+</p>
              <p className="text-[8px] text-gray-500">Online</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/5 border border-white/10">
              <Dices className="w-4 h-4 text-blue-500 mx-auto" />
              <p className="text-sm font-bold text-white">₹50L+</p>
              <p className="text-[8px] text-gray-500">Paid</p>
            </div>
          </motion.div>

          {/* Compact Wallet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-lg mb-4 flex items-center justify-between"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/20">
                <Wallet className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Balance</p>
                <p className="font-bold text-lg text-white">₹{walletBalance.toFixed(0)}</p>
              </div>
            </div>
            <Link to="/wallet">
              <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700">
                Add
              </Button>
            </Link>
          </motion.div>

          {/* Play Buttons - Top (Compact) */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-2 mb-4"
            >
              <Button
                onClick={startMatchmaking}
                disabled={walletBalance < entryAmount}
                className="h-10 text-xs font-bold rounded-lg"
                style={{
                  background: walletBalance >= entryAmount 
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : undefined,
                }}
              >
                🎲 Play vs Bot
              </Button>
              <Button
                onClick={() => setGameMode('vs-friend')}
                className="h-10 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                With Friend
              </Button>
            </motion.div>
          )}

          {!user && (
            <Link to="/auth" className="block mb-4">
              <Button className="w-full h-10 text-sm font-bold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600">
                Login to Play
              </Button>
            </Link>
          )}

          {/* Entry Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
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

          {/* Insufficient Balance */}
          {user && walletBalance < entryAmount && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-center"
            >
              <p className="text-red-400 text-xs">💰 Insufficient Balance</p>
              <Link to="/wallet" className="text-[10px] text-red-300 hover:underline">
                Add money →
              </Link>
            </motion.div>
          )}

          {/* Rules */}
          <div className="text-center mt-4">
            <Link 
              to="/ludo/rules" 
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
            >
              <Info className="w-3 h-3" />
              Rules & Fair Play
            </Link>
          </div>
        </main>

        <BottomNav />
        <TelegramFloat />
      </div>
    </PullToRefresh>
  );
};

// Animated status component
const AnimatedStatus = ({ isUserTurn, canRoll, isRolling, playerName }: { 
  isUserTurn: boolean; 
  canRoll: boolean; 
  isRolling: boolean;
  playerName: string;
}) => {
  if (!isUserTurn) {
    return (
      <motion.p 
        className="text-center text-xs text-gray-400 mt-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ⏳ {playerName} ka turn...
      </motion.p>
    );
  }

  if (isRolling) {
    return null;
  }

  if (!canRoll) {
    return (
      <motion.p 
        className="text-center text-xs text-yellow-400 mt-2 font-medium"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        👆 Token select karo!
      </motion.p>
    );
  }

  return null;
};

export default LudoPage;
