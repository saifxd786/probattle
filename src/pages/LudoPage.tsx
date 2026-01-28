import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dices, Wallet, Info, Trophy, Users, Zap, Ban, UserPlus, WifiOff, Wifi, RefreshCw, RotateCcw, Signal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

import PullToRefresh from '@/components/PullToRefresh';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

// Helper function to get realistic live users based on time of day (IST)
const getLiveUsersCount = (): string => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hour = istTime.getUTCHours();
  
  // Add randomness factor (±15%)
  const randomFactor = 0.85 + Math.random() * 0.3;
  
  let baseUsers: number;
  
  if (hour >= 0 && hour < 5) {
    // Late night (12 AM - 5 AM): Lowest activity
    baseUsers = Math.floor((400 + Math.random() * 600) * randomFactor);
  } else if (hour >= 5 && hour < 9) {
    // Early morning (5 AM - 9 AM): Low activity
    baseUsers = Math.floor((600 + Math.random() * 800) * randomFactor);
  } else if (hour >= 9 && hour < 12) {
    // Morning (9 AM - 12 PM): Moderate activity
    baseUsers = Math.floor((1500 + Math.random() * 1000) * randomFactor);
  } else if (hour >= 12 && hour < 17) {
    // Afternoon (12 PM - 5 PM): Good activity
    baseUsers = Math.floor((2500 + Math.random() * 1500) * randomFactor);
  } else if (hour >= 17 && hour < 21) {
    // Evening (5 PM - 9 PM): Peak hours
    baseUsers = Math.floor((4000 + Math.random() * 3000) * randomFactor);
  } else if (hour >= 21 && hour < 23) {
    // Night (9 PM - 11 PM): High activity
    baseUsers = Math.floor((3000 + Math.random() * 2000) * randomFactor);
  } else {
    // Late night (11 PM - 12 AM): Declining
    baseUsers = Math.floor((1500 + Math.random() * 1000) * randomFactor);
  }
  
  // Format the number
  if (baseUsers >= 1000) {
    return `${(baseUsers / 1000).toFixed(1)}K`;
  }
  return `${baseUsers}`;
};

const LudoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleRefresh } = usePullToRefresh();
  const { isBanned, isLoading: isBanLoading } = useGameBan('ludo');
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [showRematchDialog, setShowRematchDialog] = useState(false);
  const [liveUsers, setLiveUsers] = useState(getLiveUsersCount);
  
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
    rewardAmount,
    captureEvent,
    clearCaptureEvent,
    hasActiveGame,
    activeGameData,
    isCheckingActiveGame,
    resumeGame,
    dismissActiveGame
  } = useLudoGame();
  
  // Friend multiplayer hook
  const {
    gameState: friendGameState,
    walletBalance: friendWalletBalance,
    opponentOnline,
    opponentDisconnectCountdown,
    syncStatus,
    connectionStatus,
    reconnectAttempts,
    pingLatency,
    startRoom,
    rollDice: friendRollDice,
    handleTokenClick: friendHandleTokenClick,
    resetGame: friendResetGame,
    sendChatMessage,
    clearCaptureAnimation,
    resyncGameState,
    requestRematch,
    respondToRematch,
    manualReconnect,
    extendDisconnectCountdown,
    skipCountdownAndClaimWin
  } = useFriendLudoGame();

  const ENTRY_AMOUNTS = [100, 200, 500, 1000];

  // Update live users count every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveUsers(getLiveUsersCount());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-open rematch dialog when opponent requests
  useEffect(() => {
    if (
      friendGameState.phase === 'result' &&
      friendGameState.rematchStatus === 'pending' &&
      friendGameState.rematchRequester !== user?.id
    ) {
      setShowRematchDialog(true);
    }
  }, [friendGameState.rematchStatus, friendGameState.rematchRequester, friendGameState.phase, user?.id]);

  // Close dialog and reset when game restarts
  useEffect(() => {
    if (friendGameState.phase === 'playing' && showRematchDialog) {
      setShowRematchDialog(false);
    }
  }, [friendGameState.phase, showRematchDialog]);

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

  // Resume Game Dialog for Bot games
  const showResumeDialog = hasActiveGame && activeGameData && gameState.phase === 'idle' && gameMode === 'select';

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
            captureEvent={captureEvent}
            onCaptureAnimationComplete={clearCaptureEvent}
            diceValue={gameState.diceValue}
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
            {/* Connection Status Indicator */}
            {connectionStatus !== 'connected' && (
              <motion.div 
                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                  connectionStatus === 'reconnecting' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {connectionStatus === 'reconnecting' ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RefreshCw className="w-3 h-3 text-yellow-400" />
                    </motion.div>
                    <span className="text-[10px] text-yellow-400">
                      Reconnecting ({reconnectAttempts}/5)...
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] text-red-400">Disconnected</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={manualReconnect}
                      className="h-5 px-1 text-[10px] text-red-400 hover:text-red-300"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </motion.div>
            )}
            {/* Ping/Latency Indicator */}
            {pingLatency !== null && connectionStatus === 'connected' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                pingLatency < 100 ? 'bg-green-500/20' : 
                pingLatency < 200 ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <Signal className={`w-3 h-3 ${
                  pingLatency < 100 ? 'text-green-400' : 
                  pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                }`} />
                <span className={`text-[10px] font-mono ${
                  pingLatency < 100 ? 'text-green-400' : 
                  pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {pingLatency}ms
                </span>
              </div>
            )}
            {/* Opponent Online Status with Disconnect Countdown */}
            {opponentOnline ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20">
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400">Online</span>
              </div>
            ) : opponentDisconnectCountdown !== null ? (
              <motion.div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/30 border border-red-500/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <WifiOff className="w-3 h-3 text-red-400 animate-pulse" />
                <span className="text-[10px] text-red-400 font-mono">
                  Offline • {opponentDisconnectCountdown}s
                </span>
                <div className="flex gap-1 ml-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={extendDisconnectCountdown}
                    className="h-5 px-1.5 text-[9px] text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20"
                    title="Give opponent more time"
                  >
                    +60s
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-green-400 hover:text-green-300 hover:bg-green-500/20"
                        title="Claim win now"
                      >
                        Win
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-xs">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Claim Victory?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your opponent is disconnected. Are you sure you want to claim the win now? They may reconnect soon.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Wait</AlertDialogCancel>
                        <AlertDialogAction onClick={skipCountdownAndClaimWin}>
                          Claim Win
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20">
                <WifiOff className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-red-400">Offline</span>
              </div>
            )}
            {/* Sync Status & Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resyncGameState()}
              disabled={syncStatus === 'resyncing'}
              className={`h-7 px-2 text-[10px] hover:text-white ${
                syncStatus === 'mismatch' ? 'text-yellow-400 animate-pulse' : 
                syncStatus === 'resyncing' ? 'text-blue-400' : 
                'text-muted-foreground'
              }`}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${syncStatus === 'resyncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'resyncing' ? 'Syncing...' : 
               syncStatus === 'mismatch' ? '⚠️ Sync' : 'Sync'}
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
            diceValue={friendGameState.diceValue}
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
          pingLatency={pingLatency}
          opponentOnline={opponentOnline}
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

        {/* Resume Game Dialog */}
        <AlertDialog open={showResumeDialog}>
          <AlertDialogContent className="max-w-sm bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-white">
                <RefreshCw className="w-5 h-5 text-yellow-500" />
                Resume Your Game?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                You have an active game in progress. Would you like to continue where you left off?
                {activeGameData && (
                  <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Entry Amount</span>
                      <span className="text-white font-bold">₹{activeGameData.entryAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Potential Win</span>
                      <span className="text-yellow-400 font-bold">₹{activeGameData.rewardAmount}</span>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel 
                onClick={dismissActiveGame}
                className="bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
              >
                Forfeit Game
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={resumeGame}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:from-yellow-600 hover:to-orange-600"
              >
                Resume Game
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <main className="container mx-auto px-4 pt-20 pb-8">
          {/* Premium Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-6"
          >
            {/* Background glow */}
            <div className="absolute inset-0 -top-10 bg-gradient-to-b from-primary/10 via-transparent to-transparent rounded-3xl blur-2xl" />
            
            <div className="relative text-center">
              <motion.div
                className="inline-flex relative mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="relative">
                  <div 
                    className="p-4 rounded-2xl shadow-2xl"
                    style={{
                      background: 'linear-gradient(145deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)',
                      boxShadow: '0 10px 40px rgba(var(--primary-rgb), 0.4)',
                    }}
                  >
                    <Dices className="w-10 h-10 text-primary-foreground" />
                  </div>
                  {/* Sparkle effects */}
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>
              
              <h1 className="font-display text-3xl font-bold mb-1">
                <span className="text-gradient">Ludo King</span>
              </h1>
              <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-500" />
                Play & Win Real Cash
              </p>
            </div>
          </motion.div>

          {/* Stats Bar - Premium Design */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-6"
          >
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 text-center overflow-hidden group">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative z-10">
                <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-foreground">10K+</p>
                <p className="text-[10px] text-muted-foreground">Winners</p>
              </div>
            </div>
            
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 text-center overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              />
              <div className="relative z-10">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Users className="w-5 h-5 text-green-500 mx-auto mb-1" />
                </motion.div>
                <p className="text-lg font-display font-bold text-foreground">{liveUsers}+</p>
                <p className="text-[10px] text-muted-foreground">Online</p>
              </div>
            </div>
            
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 text-center overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              />
              <div className="relative z-10">
                <Dices className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-display font-bold text-foreground">₹50L+</p>
                <p className="text-[10px] text-muted-foreground">Paid</p>
              </div>
            </div>
          </motion.div>

          {/* Wallet Card - Premium */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-display font-bold text-2xl text-foreground">₹{walletBalance.toFixed(0)}</p>
                </div>
              </div>
              <Link to="/wallet">
                <Button 
                  size="sm" 
                  className="h-10 px-5 font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20"
                >
                  ADD
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Play Buttons - Premium */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3 mb-6"
            >
              <Button
                onClick={startMatchmaking}
                disabled={walletBalance < entryAmount}
                className="relative h-14 text-sm font-bold rounded-2xl overflow-hidden group"
                style={{
                  background: walletBalance >= entryAmount 
                    ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.85) 100%)'
                    : undefined,
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  <Dices className="w-5 h-5" />
                  PLAY VS BOT
                </span>
              </Button>
              
              <Button
                onClick={() => setGameMode('vs-friend')}
                className="relative h-14 text-sm font-bold rounded-2xl overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  WITH FRIEND
                </span>
              </Button>
            </motion.div>
          )}

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Link to="/auth">
                <Button className="w-full h-14 text-sm font-bold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
                  Login to Play
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Entry Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
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

          {/* Insufficient Balance Warning */}
          {user && walletBalance < entryAmount && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-red-400 text-sm font-medium">Insufficient Balance</p>
                  <p className="text-xs text-muted-foreground">Add ₹{entryAmount - walletBalance} more to play</p>
                </div>
                <Link to="/wallet">
                  <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                    Add Money
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Rules Link */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Link 
              to="/ludo/rules" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-4 h-4" />
              Rules & Fair Play
            </Link>
          </motion.div>
        </main>

        <BottomNav />
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
