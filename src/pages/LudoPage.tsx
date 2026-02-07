import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dices, Wallet, Info, Trophy, Users, Zap, Ban, UserPlus, WifiOff, Wifi, RefreshCw, RotateCcw, Signal, LogOut } from 'lucide-react';
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
import ChallengesPage from '@/components/ludo/ChallengesPage';
import { CUSTOM_AVATARS } from '@/components/ludo/LudoAvatarPicker';
import { useLudoGame } from '@/hooks/useLudoGame';
import { useFriendLudoGame } from '@/hooks/useFriendLudoGame';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useGameBan } from '@/hooks/useGameBan';

type GameMode = 'select' | 'vs-bot' | 'vs-friend';

// Helper to resolve selected avatar to URL
const getResolvedAvatarUrl = (selectedAvatar: string | null, profileAvatar?: string | null): string | undefined => {
  if (selectedAvatar === null || selectedAvatar === 'profile') {
    return profileAvatar || undefined;
  }
  const customAvatar = CUSTOM_AVATARS.find(a => a.id === selectedAvatar);
  return customAvatar?.src || profileAvatar || undefined;
};

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

const SquareTurnTimerAvatar = ({
  avatarUrl,
  fallbackText,
  borderColor,
  isActive,
  timeLeft,
  badgeSide,
  isOffline,
  offlineTimeLeft,
}: {
  avatarUrl?: string | null;
  fallbackText: string;
  borderColor: string;
  isActive: boolean;
  timeLeft: number;
  badgeSide: 'left' | 'right';
  isOffline?: boolean;
  offlineTimeLeft?: number | null;
}) => {
  // Use offline timer when available, otherwise turn timer
  const isOfflineMode = isOffline && offlineTimeLeft !== null && offlineTimeLeft !== undefined;
  const maxTime = isOfflineMode ? 60 : 15;
  const displayTimeLeft = isOfflineMode ? offlineTimeLeft! : timeLeft;
  const safeTimeLeft = Math.max(0, Math.min(maxTime, displayTimeLeft));
  const progress = (safeTimeLeft / maxTime) * 100;
  const isLowTime = isOfflineMode ? safeTimeLeft <= 10 : safeTimeLeft <= 5;

  const size = 56; // matches w-14/h-14
  const strokeWidth = 3;
  const innerSize = size - strokeWidth;
  const perimeter = innerSize * 4;
  const strokeDashoffset = perimeter - (progress / 100) * perimeter;

  // Determine border color based on state
  const activeBorderColor = isOfflineMode ? '#EF4444' : (isLowTime ? '#E53935' : borderColor);

  return (
    <div className="relative" style={{ width: size, height: size + 20 }}>
      {/* Avatar with timer border */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="absolute inset-0 z-20 pointer-events-none" width={size} height={size}>
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={innerSize}
            height={innerSize}
            rx={10}
            ry={10}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={strokeWidth}
          />

          {/* Show timer border when active turn OR when offline countdown is running */}
          {(isActive || isOfflineMode) && (
            <motion.rect
              x={strokeWidth / 2}
              y={strokeWidth / 2}
              width={innerSize}
              height={innerSize}
              rx={10}
              ry={10}
              fill="none"
              stroke={activeBorderColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${perimeter} ${perimeter}`}
              initial={false}
              animate={{
                strokeDashoffset,
                opacity: isOfflineMode || isLowTime ? [1, 0.55, 1] : 1,
              }}
              transition={{
                strokeDashoffset: { duration: 1, ease: 'linear', type: 'tween' },
                opacity: isOfflineMode || isLowTime
                  ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut', type: 'tween' }
                  : { duration: 0.2, ease: 'linear', type: 'tween' },
              }}
              style={{
                filter: isOfflineMode
                  ? 'drop-shadow(0 0 10px rgba(239,68,68,0.75))'
                  : isLowTime
                    ? 'drop-shadow(0 0 10px rgba(229,57,53,0.75))'
                    : `drop-shadow(0 0 10px ${borderColor}80)`,
                transformOrigin: 'center',
              }}
            />
          )}
        </svg>

        <div
          className="absolute z-10 rounded-xl overflow-hidden"
          style={{
            top: strokeWidth,
            left: strokeWidth,
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            background: `linear-gradient(135deg, ${borderColor}dd, ${borderColor}88)`,
            opacity: isOfflineMode ? 0.6 : 1,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={fallbackText} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
              {fallbackText}
            </div>
          )}
          
          {/* Offline overlay */}
          {isOfflineMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-[8px] font-bold text-red-400 uppercase">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Badges below avatar - TURN + Timer (or OFFLINE + countdown) */}
      {(isActive || isOfflineMode) && (
        <div
          className={`absolute z-30 flex items-center gap-1 ${
            badgeSide === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{ top: size + 2 }}
        >
          {/* Status badge */}
          <div
            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wide"
            style={{ background: isOfflineMode ? '#EF4444' : '#43A047' }}
          >
            {isOfflineMode ? 'Offline' : 'Turn'}
          </div>
          {/* Timer badge */}
          <motion.div
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white tabular-nums"
            style={{ background: isOfflineMode || isLowTime ? '#E53935' : 'rgba(0,0,0,0.6)' }}
            animate={isOfflineMode || isLowTime ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, type: 'tween' }}
          >
            {safeTimeLeft}s
          </motion.div>
        </div>
      )}
    </div>
  );
};

const LudoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleRefresh } = usePullToRefresh();
  const { isBanned, isLoading: isBanLoading } = useGameBan('ludo');
  const [gameMode, setGameMode] = useState<GameMode>('select');
  const [showRematchDialog, setShowRematchDialog] = useState(false);
  const [liveUsers, setLiveUsers] = useState(getLiveUsersCount);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>('profile');
  const [showChallengesPage, setShowChallengesPage] = useState<'create' | 'join' | null>(null);
  
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
    skipTurn,
    userAvatar
  } = useLudoGame();
  
  // Friend multiplayer hook
  const {
    gameState: friendGameState,
    walletBalance: friendWalletBalance,
    opponentOnline,
    opponentDisconnectCountdown,
    syncStatus,
    connectionStatus,
    connectionQuality,
    reconnectAttempts,
    pingLatency,
    turnTimeLeft: friendTurnTimeLeft,
    startRoom,
    rollDice: friendRollDice,
    handleTokenClick: friendHandleTokenClick,
    resetGame: friendResetGame,
    exitAndForfeit: friendExitAndForfeit,
    sendChatMessage,
    clearCaptureAnimation,
    resyncGameState,
    requestRematch,
    respondToRematch,
    manualReconnect,
    // Active room resume functionality
    hasActiveFriendRoom,
    activeFriendRoomData,
    isCheckingActiveRoom,
    resumeFriendRoom,
    dismissActiveFriendRoom
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

  // Auto-switch to vs-friend mode when friend game is active (for reconnection)
  useEffect(() => {
    if (friendGameState.phase === 'playing' || friendGameState.phase === 'waiting') {
      if (gameMode !== 'vs-friend') {
        console.log('[LudoPage] Auto-switching to vs-friend mode for active game');
        setGameMode('vs-friend');
      }
    }
  }, [friendGameState.phase, gameMode]);

  if (isBanned && !isBanLoading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-[100dvh] bg-background pb-20">
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
        <div className="min-h-[100dvh] bg-background pb-20">
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
  
  // Resume Game Dialog for Friend games
  const showFriendResumeDialog = hasActiveFriendRoom && activeFriendRoomData && friendGameState.phase === 'idle' && gameMode === 'select';

  // Resolved avatar for current user
  const userResolvedAvatar = getResolvedAvatarUrl(selectedAvatar, userAvatar);

  // Matchmaking Screen
  if (gameState.phase === 'matchmaking') {
    return (
      <MatchmakingScreen
        players={gameState.players.map(p => ({
          id: p.id,
          name: p.name,
          uid: p.uid,
          avatar: p.isBot ? undefined : (p.id === user?.id ? userResolvedAvatar : p.avatar),
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
        className="h-[100dvh] flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
        }}
      >
        {/* Compact Game Header - Exit, Prize, Chat & Controls */}
        <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Exit Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-300">
                  <LogOut className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-xs">
                <AlertDialogHeader>
                  <AlertDialogTitle>Exit Game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    If you exit now, you will lose the match and forfeit your entry fee of ₹{entryAmount}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continue Playing</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { resetGame(); setGameMode('select'); }} className="bg-red-600 hover:bg-red-700">
                    Exit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <SoundToggle compact />
          </div>
          {/* Premium Prize Badge */}
          <motion.div 
            className="relative overflow-hidden"
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Outer glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 rounded-xl blur-sm" />
            
            {/* Main badge container */}
            <div 
              className="relative px-4 py-2 rounded-xl border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(180, 130, 60, 0.25) 0%, rgba(120, 80, 40, 0.35) 100%)',
                borderColor: 'rgba(212, 175, 55, 0.6)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              {/* Inner shine effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-30"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)'
                }}
              />
              
              {/* Content */}
              <div className="relative text-center">
                <p 
                  className="text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: 'rgba(212, 175, 55, 0.9)' }}
                >
                  Prize
                </p>
                <p 
                  className="font-bold text-base leading-tight"
                  style={{ 
                    color: '#F5D77A',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  ₹{rewardAmount}
                </p>
              </div>
            </div>
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

        {/* Bottom Section - Combined VS Bar with Dice - Supports 2 or 4 players */}
        <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-black/60">
          {playerMode === 4 ? (
            // 4 Player Layout - All players in a row with dice in center
            <div className="flex items-center justify-between gap-1">
              {gameState.players.map((player, index) => {
                const colorMap: Record<string, string> = {
                  red: '#E53935',
                  green: '#43A047', 
                  yellow: '#FFD600',
                  blue: '#1E88E5'
                };
                const isActive = gameState.currentTurn === index;
                const displayAvatar = player.id === user?.id ? userResolvedAvatar : player.avatar;
                
                // Place dice in center (after player 1)
                if (index === 2) {
                  return (
                    <React.Fragment key={`dice-${index}`}>
                      {/* Dice in center */}
                      <div className="flex flex-col items-center mx-1">
                        <LudoDice
                          value={gameState.diceValue}
                          isRolling={gameState.isRolling}
                          onRoll={rollDice}
                          disabled={!isUserTurn}
                          canRoll={gameState.canRoll && isUserTurn}
                          compact
                        />
                      </div>
                      {/* Player 3 */}
                      <div className="flex flex-col items-center" key={player.color}>
                        <div 
                          className="w-9 h-9 rounded-lg overflow-hidden"
                          style={{
                            border: isActive ? `2px solid ${colorMap[player.color]}` : '2px solid rgba(255,255,255,0.2)',
                            boxShadow: isActive ? `0 0 8px ${colorMap[player.color]}80` : 'none',
                          }}
                        >
                          {displayAvatar ? (
                            <img src={displayAvatar} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: colorMap[player.color] }}
                            >
                              {player.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <p className="text-[8px] text-white/70 mt-0.5 truncate max-w-[40px]">{player.name}</p>
                        {isActive && (
                          <div 
                            className="px-1 py-0.5 rounded text-[7px] font-bold text-white mt-0.5"
                            style={{ background: colorMap[player.color] }}
                          >
                            {turnTimeLeft}s
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                }
                
                return (
                  <div className="flex flex-col items-center" key={player.color}>
                    <div 
                      className="w-9 h-9 rounded-lg overflow-hidden"
                      style={{
                        border: isActive ? `2px solid ${colorMap[player.color]}` : '2px solid rgba(255,255,255,0.2)',
                        boxShadow: isActive ? `0 0 8px ${colorMap[player.color]}80` : 'none',
                      }}
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: colorMap[player.color] }}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] text-white/70 mt-0.5 truncate max-w-[40px]">{player.name}</p>
                    {isActive && (
                      <div 
                        className="px-1 py-0.5 rounded text-[7px] font-bold text-white mt-0.5"
                        style={{ background: colorMap[player.color] }}
                      >
                        {turnTimeLeft}s
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // 2 Player Layout - Original design
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
                const displayAvatar = player.id === user?.id ? userResolvedAvatar : player.avatar;
                return (
                  <div className="flex items-center gap-2">
                    <SquareTurnTimerAvatar
                      avatarUrl={displayAvatar}
                      fallbackText={player.name.slice(0, 2).toUpperCase()}
                      borderColor={colorMap[player.color]}
                      isActive={isActive}
                      timeLeft={turnTimeLeft}
                      badgeSide="left"
                    />
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
                const displayAvatar = player.id === user?.id ? userResolvedAvatar : player.avatar;
                return (
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <SquareTurnTimerAvatar
                      avatarUrl={displayAvatar}
                      fallbackText={player.name.slice(0, 2).toUpperCase()}
                      borderColor={colorMap[player.color]}
                      isActive={isActive}
                      timeLeft={turnTimeLeft}
                      badgeSide="right"
                    />
                    <div className="text-right">
                      <p className="text-white/80 font-medium text-xs">{player.name}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
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
        className="h-[100dvh] flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)',
        }}
      >
        {/* Compact Game Header - Exit, Controls Only */}
        <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Exit Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-300">
                  <LogOut className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-xs">
                <AlertDialogHeader>
                  <AlertDialogTitle>Exit Game?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {friendGameState.entryAmount > 0 
                      ? `If you exit now, you will lose the match and forfeit your entry fee of ₹${friendGameState.entryAmount}. Your opponent wins immediately.`
                      : 'If you exit now, your opponent will win the match immediately.'
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continue Playing</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={async () => { 
                      await friendExitAndForfeit(); 
                      friendResetGame(); 
                      setGameMode('select'); 
                    }} 
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Exit & Forfeit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            {/* Connection Quality Indicator - shows when opponent is online */}
            {connectionStatus === 'connected' && opponentOnline && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                connectionQuality === 'excellent' ? 'bg-green-500/20' : 
                connectionQuality === 'good' ? 'bg-emerald-500/20' : 
                connectionQuality === 'fair' ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                {/* Signal bars */}
                <div className="flex items-end gap-0.5 h-3">
                  <div className={`w-0.5 h-1 rounded-sm ${connectionQuality !== 'poor' ? 'bg-current' : 'bg-gray-600'}`} />
                  <div className={`w-0.5 h-1.5 rounded-sm ${connectionQuality === 'excellent' || connectionQuality === 'good' || connectionQuality === 'fair' ? 'bg-current' : 'bg-gray-600'}`} />
                  <div className={`w-0.5 h-2 rounded-sm ${connectionQuality === 'excellent' || connectionQuality === 'good' ? 'bg-current' : 'bg-gray-600'}`} />
                  <div className={`w-0.5 h-2.5 rounded-sm ${connectionQuality === 'excellent' ? 'bg-current' : 'bg-gray-600'}`} />
                </div>
                <span className={`text-[10px] font-mono ${
                  connectionQuality === 'excellent' ? 'text-green-400' : 
                  connectionQuality === 'good' ? 'text-emerald-400' : 
                  connectionQuality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {pingLatency !== null ? `${pingLatency}ms` : '...'}
                </span>
              </div>
            )}
            {/* Connection loading when opponent not yet connected */}
            {connectionStatus === 'connected' && !opponentOnline && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-500/20">
                <Wifi className="w-3 h-3 text-gray-400 animate-pulse" />
                <span className="text-[10px] text-gray-400">Waiting...</span>
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
            {/* Premium Prize Badge */}
            <motion.div 
              className="relative overflow-hidden"
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-500/30 rounded-xl blur-sm" />
              
              {/* Main badge container */}
              <div 
                className="relative px-4 py-2 rounded-xl border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(180, 130, 60, 0.25) 0%, rgba(120, 80, 40, 0.35) 100%)',
                  borderColor: 'rgba(212, 175, 55, 0.6)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                {/* Inner shine effect */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-30"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)'
                  }}
                />
                
                {/* Content */}
                <div className="relative text-center">
                  <p 
                    className="text-[9px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: 'rgba(212, 175, 55, 0.9)' }}
                  >
                    Prize
                  </p>
                  <p 
                    className="font-bold text-base leading-tight"
                    style={{ 
                      color: '#F5D77A',
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                    }}
                  >
                    ₹{friendGameState.rewardAmount}
                  </p>
                </div>
              </div>
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
          {/* Player VS Bar - Self always on LEFT, Opponent always on RIGHT */}
          {(() => {
            const colorMap: Record<string, string> = {
              red: '#E53935',
              green: '#43A047', 
              yellow: '#FFD600',
              blue: '#1E88E5'
            };
            
            // Always show current user on left, opponent on right
            const selfPlayer = friendGameState.players.find(p => p.id === user?.id);
            const opponentPlayer = friendGameState.players.find(p => p.id !== user?.id);
            
            const selfIndex = friendGameState.players.findIndex(p => p.id === user?.id);
            const opponentIndex = friendGameState.players.findIndex(p => p.id !== user?.id);
            
            const isSelfTurn = friendGameState.currentTurn === selfIndex;
            const isOpponentTurn = friendGameState.currentTurn === opponentIndex;
            
            return (
              <div className="flex items-center justify-between">
                {/* Left - SELF (Current User) */}
                {selfPlayer && (
                  <div className="flex items-center gap-2">
                    <SquareTurnTimerAvatar
                      avatarUrl={selfPlayer.avatar}
                      fallbackText={selfPlayer.name.slice(0, 2).toUpperCase()}
                      borderColor={colorMap[selfPlayer.color]}
                      isActive={isSelfTurn}
                      timeLeft={friendTurnTimeLeft}
                      badgeSide="left"
                    />
                    <div className="text-left">
                      <p className="text-white/80 font-medium text-xs">{selfPlayer.name}</p>
                      <p className="text-[9px] text-green-400">You</p>
                    </div>
                  </div>
                )}

                {/* Center - Dice with Status */}
                <div className="flex flex-col items-center gap-1">
                  {/* Connection Status - Compact */}
                  {!opponentOnline && opponentDisconnectCountdown !== null && (
                    <div className="flex flex-col items-center gap-0.5 px-2 py-1 rounded bg-red-500/30 border border-red-500/50 mb-1">
                      <div className="flex items-center gap-1">
                        <WifiOff className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                        <span className="text-[9px] text-red-400 font-medium">Opponent Disconnected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white font-mono font-bold">{opponentDisconnectCountdown}s</span>
                        <span className="text-[8px] text-red-300">until auto-win</span>
                      </div>
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

                {/* Right - OPPONENT (Friend) */}
                {opponentPlayer && (
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <SquareTurnTimerAvatar
                      avatarUrl={opponentPlayer.avatar}
                      fallbackText={opponentPlayer.name.slice(0, 2).toUpperCase()}
                      borderColor={colorMap[opponentPlayer.color]}
                      isActive={isOpponentTurn}
                      timeLeft={friendTurnTimeLeft}
                      badgeSide="right"
                      isOffline={!opponentOnline}
                      offlineTimeLeft={opponentDisconnectCountdown}
                    />
                    <div className="text-right">
                      <p className="text-white/80 font-medium text-xs">{opponentPlayer.name}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
        className="h-[100dvh] flex flex-col overflow-hidden"
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
      {/* Resume Game Dialog for Bot games */}
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
              Exit Game
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

      {/* Resume Game Dialog for Friend games */}
      <AlertDialog open={showFriendResumeDialog}>
        <AlertDialogContent className="max-w-sm bg-gradient-to-br from-gray-900 to-gray-800 border-indigo-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-indigo-500" />
              Resume Friend Match?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              You have an active friend match in progress. Would you like to continue?
              {activeFriendRoomData && (
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Room Code</span>
                    <span className="text-indigo-400 font-mono font-bold">{activeFriendRoomData.roomCode}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Entry Amount</span>
                    <span className="text-white font-bold">₹{activeFriendRoomData.entryAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">Prize</span>
                    <span className="text-yellow-400 font-bold">₹{activeFriendRoomData.rewardAmount}</span>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel 
              onClick={() => {
                dismissActiveFriendRoom();
              }}
              className="bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
            >
              Exit Match
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setGameMode('vs-friend');
                resumeFriendRoom();
              }}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:from-indigo-600 hover:to-purple-600"
            >
              Resume Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Challenges Page (Full Screen Overlay) */}
      {showChallengesPage && (
        <ChallengesPage
          mode={showChallengesPage}
          minEntryAmount={settings.minEntryAmount}
          walletBalance={walletBalance}
          rewardMultiplier={settings.rewardMultiplier}
          onBack={() => setShowChallengesPage(null)}
          onAcceptChallenge={(data) => {
            // Navigate to friend game with room data
            setEntryAmount(data.entryAmount);
            setShowChallengesPage(null);
            // Start friend game with full room data
            startRoom(data.roomId, data.roomCode, data.isHost, data.entryAmount, data.rewardAmount);
            setGameMode('vs-friend');
          }}
          onCreateChallenge={(amount, mode) => {
            // This is now handled inside ChallengesPage - user waits there
            setEntryAmount(amount);
            setPlayerMode(mode);
          }}
          onSwitchToJoin={() => setShowChallengesPage('join')}
        />
      )}
      
      {!showChallengesPage && (
        <LudoLobby
          user={user}
          walletBalance={walletBalance}
          entryAmount={entryAmount}
          setEntryAmount={setEntryAmount}
          playerMode={playerMode}
          setPlayerMode={setPlayerMode}
          settings={settings}
          liveUsers={liveUsers}
          startMatchmaking={() => setShowChallengesPage('create')}
          onPlayWithFriend={() => setGameMode('vs-friend')}
          onJoinChallenge={() => setShowChallengesPage('join')}
          selectedAvatar={selectedAvatar}
          onSelectAvatar={setSelectedAvatar}
          userAvatar={userAvatar}
        />
      )}
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
