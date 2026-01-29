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
import LudoLobby from '@/components/ludo/LudoLobby';
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
    dismissActiveGame,
    turnTimeLeft,
    offlineTimeLeft,
    skipTurn
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
          avatar: p.avatar,
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
        {/* Compact Game Header - Prize, Chat & Controls */}
        <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <SoundToggle compact />
          <motion.div 
            className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-[8px] text-yellow-500 uppercase tracking-wide">Prize</p>
            <p className="font-bold text-sm text-yellow-400">₹{rewardAmount}</p>
          </motion.div>
          {/* Chat Button in Header */}
          {user && (
            <LudoChat
              messages={[]}
              onSendMessage={() => {}}
              currentUserId={user.id}
              playerColor={gameState.players.find(p => !p.isBot)?.color || 'red'}
              inHeader
            />
          )}
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
              isBot: p.isBot,
              avatar: p.avatar
            }))}
            onTokenClick={isUserTurn && !gameState.canRoll ? handleTokenClick : undefined}
            selectedToken={gameState.selectedToken}
            captureEvent={captureEvent}
            onCaptureAnimationComplete={clearCaptureEvent}
            diceValue={gameState.diceValue}
            turnTimeLeft={turnTimeLeft}
            onTurnTimeout={skipTurn}
            offlineTimeLeft={offlineTimeLeft}
          />
        </div>

        {/* Bottom Section - Combined VS Bar with Dice */}
        <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-black/60">
          <div className="flex items-center justify-between">
            {/* Left Player */}
            {gameState.players[0] && (() => {
              const player = gameState.players[0];
              const colorMap: Record<string, string> = {
                red: '#E53935',
                green: '#43A047', 
                yellow: '#FFD600',
                blue: '#1E88E5'
              };
              const isActive = gameState.currentTurn === 0;
              return (
                <div className="flex items-center gap-2">
                  {/* Avatar with Timer */}
                  <div className="relative">
                    {player.avatar ? (
                      <img 
                        src={player.avatar}
                        alt={player.name}
                        className="w-14 h-14 rounded-xl object-cover"
                        style={{ 
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ 
                          background: `linear-gradient(135deg, ${colorMap[player.color]}dd, ${colorMap[player.color]}88)`,
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      >
                        {player.isBot ? '🤖' : player.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Timer Badge */}
                    {isActive && turnTimeLeft !== null && (
                      <div 
                        className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: turnTimeLeft <= 5 ? '#E53935' : '#43A047' }}
                      >
                        {turnTimeLeft}s
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="text-left">
                    <p className="text-white/80 font-medium text-xs">{player.name}</p>
                  </div>
                </div>
              );
            })()}

            {/* Center - Dice */}
            <div className="flex flex-col items-center">
              <LudoDice
                value={gameState.diceValue}
                isRolling={gameState.isRolling}
                onRoll={rollDice}
                disabled={!isUserTurn}
                canRoll={gameState.canRoll && isUserTurn}
                compact
              />
            </div>

            {/* Right Player */}
            {gameState.players[1] && (() => {
              const player = gameState.players[1];
              const colorMap: Record<string, string> = {
                red: '#E53935',
                green: '#43A047', 
                yellow: '#FFD600',
                blue: '#1E88E5'
              };
              const isActive = gameState.currentTurn === 1;
              return (
                <div className="flex items-center gap-2 flex-row-reverse">
                  {/* Avatar with Timer */}
                  <div className="relative">
                    {player.avatar ? (
                      <img 
                        src={player.avatar}
                        alt={player.name}
                        className="w-14 h-14 rounded-xl object-cover"
                        style={{ 
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ 
                          background: `linear-gradient(135deg, ${colorMap[player.color]}dd, ${colorMap[player.color]}88)`,
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      >
                        {player.isBot ? '🤖' : player.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Timer Badge */}
                    {isActive && turnTimeLeft !== null && (
                      <div 
                        className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ background: turnTimeLeft <= 5 ? '#E53935' : '#43A047' }}
                      >
                        {turnTimeLeft}s
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="text-right">
                    <p className="text-white/80 font-medium text-xs">{player.name}</p>
                  </div>
                </div>
              );
            })()}
          </div>
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
        {/* Compact Game Header - Controls Only */}
        <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Connection Status */}
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
                      Reconnecting...
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={manualReconnect}
                      className="h-5 px-1 text-[10px] text-red-400"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </motion.div>
            )}
            {/* Ping */}
            {pingLatency !== null && connectionStatus === 'connected' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                pingLatency < 100 ? 'bg-green-500/20' : pingLatency < 200 ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <Signal className={`w-3 h-3 ${pingLatency < 100 ? 'text-green-400' : pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'}`} />
                <span className={`text-[10px] font-mono ${pingLatency < 100 ? 'text-green-400' : pingLatency < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {pingLatency}ms
                </span>
              </div>
            )}
            {/* Sync */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resyncGameState()}
              disabled={syncStatus === 'resyncing'}
              className={`h-7 px-2 text-[10px] ${syncStatus === 'mismatch' ? 'text-yellow-400' : 'text-muted-foreground'}`}
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'resyncing' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle compact />
            <motion.div 
              className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <p className="text-[8px] text-yellow-500 uppercase tracking-wide">Prize</p>
              <p className="font-bold text-sm text-yellow-400">₹{friendGameState.rewardAmount}</p>
            </motion.div>
            {/* Chat Button in Header */}
            {user && (
              <LudoChat
                messages={friendGameState.chatMessages}
                onSendMessage={sendChatMessage}
                currentUserId={user.id}
                playerColor={friendGameState.players.find(p => p.id === user.id)?.color || 'red'}
                inHeader
              />
            )}
          </div>
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

        {/* Bottom Section - Flat VS Bar with Dice */}
        <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-[#0A0A0F]/90">
          {/* Player VS Bar */}
          <div className="flex items-center justify-between">
            {/* Left Player */}
            {friendGameState.players[0] && (() => {
              const player = friendGameState.players[0];
              const colorMap: Record<string, string> = {
                red: '#E53935',
                green: '#43A047', 
                yellow: '#FFD600',
                blue: '#1E88E5'
              };
              const isActive = friendGameState.currentTurn === 0;
              const isCurrentUser = player.id === user?.id;
              return (
                <div className="flex items-center gap-2">
                  {/* Avatar with Timer */}
                  <div className="relative">
                    {player.avatar ? (
                      <img 
                        src={player.avatar}
                        alt={player.name}
                        className="w-12 h-12 rounded-xl object-cover"
                        style={{ 
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base"
                        style={{ 
                          background: `linear-gradient(135deg, ${colorMap[player.color]}dd, ${colorMap[player.color]}88)`,
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      >
                        {isCurrentUser ? '👤' : player.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Turn/Timer Badge */}
                    {isActive && (
                      <div 
                        className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-green-500"
                      >
                        TURN
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="text-left">
                    <p className="text-white/80 font-medium text-xs">{player.name}</p>
                  </div>
                </div>
              );
            })()}

            {/* Center - Dice with Status */}
            <div className="flex flex-col items-center gap-1">
              {/* Connection Status - Compact */}
              {!opponentOnline && opponentDisconnectCountdown !== null && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/30 border border-red-500/50 mb-1">
                  <WifiOff className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                  <span className="text-[9px] text-red-400 font-mono">{opponentDisconnectCountdown}s</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={extendDisconnectCountdown}
                    className="h-4 px-1 text-[8px] text-yellow-400 hover:bg-yellow-500/20"
                  >
                    +60s
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 px-1 text-[8px] text-green-400 hover:bg-green-500/20">
                        Win
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-xs">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Claim Victory?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your opponent is disconnected. Claim the win now?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Wait</AlertDialogCancel>
                        <AlertDialogAction onClick={skipCountdownAndClaimWin}>Claim Win</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              {!opponentOnline && opponentDisconnectCountdown === null && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 mb-1">
                  <WifiOff className="w-2.5 h-2.5 text-red-400" />
                  <span className="text-[9px] text-red-400">Offline</span>
                </div>
              )}
              <LudoDice
                value={friendGameState.diceValue}
                isRolling={friendGameState.isRolling}
                onRoll={friendRollDice}
                disabled={!isUserTurn}
                canRoll={friendGameState.canRoll && isUserTurn}
                compact
              />
            </div>

            {/* Right Player */}
            {friendGameState.players[1] && (() => {
              const player = friendGameState.players[1];
              const colorMap: Record<string, string> = {
                red: '#E53935',
                green: '#43A047', 
                yellow: '#FFD600',
                blue: '#1E88E5'
              };
              const isActive = friendGameState.currentTurn === 1;
              const isCurrentUser = player.id === user?.id;
              return (
                <div className="flex items-center gap-2 flex-row-reverse">
                  {/* Avatar with Timer */}
                  <div className="relative">
                    {player.avatar ? (
                      <img 
                        src={player.avatar}
                        alt={player.name}
                        className="w-12 h-12 rounded-xl object-cover"
                        style={{ 
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base"
                        style={{ 
                          background: `linear-gradient(135deg, ${colorMap[player.color]}dd, ${colorMap[player.color]}88)`,
                          border: `2px solid ${colorMap[player.color]}`,
                          boxShadow: isActive ? `0 0 12px ${colorMap[player.color]}80` : 'none'
                        }}
                      >
                        {isCurrentUser ? '👤' : player.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Turn/Timer Badge */}
                    {isActive && (
                      <div 
                        className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-green-500"
                      >
                        TURN
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="text-right">
                    <p className="text-white/80 font-medium text-xs">{player.name}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

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

  // Home Screen - Professional Lobby (No Header/Footer, No Scrolling)
  return (
    <>
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
      
      <LudoLobby
        user={user}
        walletBalance={walletBalance}
        entryAmount={entryAmount}
        setEntryAmount={setEntryAmount}
        playerMode={playerMode}
        setPlayerMode={setPlayerMode}
        settings={settings}
        liveUsers={liveUsers}
        startMatchmaking={startMatchmaking}
        onPlayWithFriend={() => setGameMode('vs-friend')}
      />
    </>
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
