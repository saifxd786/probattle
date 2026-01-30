/**
 * SERVER-AUTHORITATIVE LUDO GAME HOOK
 * 
 * This hook implements a fully server-authoritative architecture for Friend vs Friend Ludo.
 * 
 * Key Features:
 * 1. Server generates all dice values (secure RNG)
 * 2. Server validates all moves
 * 3. Lockstep turn system - only current player can act
 * 4. Event-based sync (30-50ms delta events)
 * 5. Reconnect-resync using last confirmed server state
 * 6. Anti-cheat validation (invalid moves rejected)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  ServerMessage,
  ServerGameState,
  ServerPlayer,
  ClientAction,
  DiceRollPayload,
  TokenMovePayload,
  CapturePayload,
  TurnSwitchPayload,
  GameEndPayload,
  SyncPayload,
  SERVER_SYNC_CONFIG,
  createAction,
  parseServerMessage,
  isValidVersion,
  actionRateLimiter,
  uiLatencyTracker
} from '@/utils/ludoServerProtocol';

// ===== TYPES =====
interface Token {
  id: number;
  position: number;
  color: string;
}

interface Player {
  id: string;
  name: string;
  uid: string;
  isBot: boolean;
  color: string;
  tokens: Token[];
  tokensHome: number;
  avatar?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  isEmoji: boolean;
  timestamp: Date;
}

// Animation lock state for UI
interface AnimationLockState {
  isLocked: boolean;
  lockUntil: number;
  lockType: 'DICE_ROLL' | 'TOKEN_MOVE' | 'CAPTURE' | null;
}

// Optimistic animation state for Ludo King-like feel
interface OptimisticAnimationState {
  // Dice rolling optimistic state
  isDiceAnimating: boolean;
  diceAnimationStart: number;
  pendingDiceValue: number | null;
  serverDiceConfirmed: boolean;
  
  // Token move optimistic state
  isTokenAnimating: boolean;
  tokenAnimationStart: number;
  pendingTokenMove: {
    tokenId: number;
    color: string;
    fromPosition: number;
    estimatedToPosition: number;
  } | null;
  serverMoveConfirmed: boolean;
}

interface ServerAuthGameState {
  phase: 'idle' | 'waiting' | 'playing' | 'result';
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  players: Player[];
  currentTurn: number;
  diceValue: number;
  isRolling: boolean;
  canRoll: boolean;
  canMove: boolean;
  selectedToken: { color: string; tokenId: number } | null;
  winner: Player | null;
  entryAmount: number;
  rewardAmount: number;
  chatMessages: ChatMessage[];
  captureAnimation: {
    isActive: boolean;
    position: { x: number; y: number };
    capturedColor: string;
  } | null;
  rematchStatus: 'idle' | 'pending' | 'accepted' | 'declined' | 'timeout';
  rematchRequester: string | null;
  // Server sync state
  serverVersion: number;
  lastServerSync: number;
  pendingAction: string | null;
  // Animation lock (client mirrors server lock)
  animationLock: AnimationLockState;
  // Optimistic animations for Ludo King feel
  optimisticAnimation: OptimisticAnimationState;
}

// ===== CONFIGURATION =====
const COLORS = ['red', 'green'];
const SERVER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ludo-game-server`;

// ===== MAIN HOOK =====
export const useServerAuthLudoGame = () => {
  const { user, isRefreshing, lastUserId } = useAuth();
  const { toast } = useToast();
  
  // Channel refs
  const serverChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  
  // Timing refs
  const lastActionTimeRef = useRef<number>(0);
  const pendingActionRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const staleChannelCleanupRef = useRef<NodeJS.Timeout | null>(null);
  
  // Faster disconnect detection refs
  const missedHeartbeatsRef = useRef<number>(0);
  const lastHeartbeatResponseRef = useRef<number>(Date.now());
  const isAppInBackgroundRef = useRef<boolean>(false);
  const backgroundTimestampRef = useRef<number>(0);
  
  // Reconnection refs
  const lastRoomIdRef = useRef<string | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // Sticky session - persist channel across match
  const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Game state
  const [gameState, setGameState] = useState<ServerAuthGameState>({
    phase: 'idle',
    roomId: null,
    roomCode: null,
    isHost: false,
    players: [],
    currentTurn: 0,
    diceValue: 1,
    isRolling: false,
    canRoll: false,
    canMove: false,
    selectedToken: null,
    winner: null,
    entryAmount: 0,
    rewardAmount: 0,
    chatMessages: [],
    captureAnimation: null,
    rematchStatus: 'idle',
    rematchRequester: null,
    serverVersion: 0,
    lastServerSync: Date.now(),
    pendingAction: null,
    animationLock: {
      isLocked: false,
      lockUntil: 0,
      lockType: null
    },
    optimisticAnimation: {
      isDiceAnimating: false,
      diceAnimationStart: 0,
      pendingDiceValue: null,
      serverDiceConfirmed: false,
      isTokenAnimating: false,
      tokenAnimationStart: 0,
      pendingTokenMove: null,
      serverMoveConfirmed: false
    }
  });

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [opponentDisconnectCountdown, setOpponentDisconnectCountdown] = useState<number | null>(null);

  // ===== SERVER COMMUNICATION =====
  
  /**
   * Send action to server
   */
  const sendServerAction = useCallback(async (action: ClientAction): Promise<ServerMessage | null> => {
    if (!actionRateLimiter.canPerformAction()) {
      console.warn('[ServerAuth] Rate limited');
      return null;
    }

    const startTime = Date.now();
    pendingActionRef.current = action.action;
    setGameState(prev => ({ ...prev, pendingAction: action.action }));

    try {
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(action)
      });

      const data = await response.json();
      
      // Track latency for UI
      const latency = Date.now() - startTime;
      uiLatencyTracker.addSample(latency);
      setPingLatency(uiLatencyTracker.getDisplayLatency());

      if (!response.ok) {
        console.error('[ServerAuth] Server error:', data);
        if (data.error === 'NOT_YOUR_TURN') {
          toast({ title: 'Not your turn!', variant: 'destructive' });
        }
        return null;
      }

      return data as ServerMessage;
    } catch (error) {
      console.error('[ServerAuth] Request failed:', error);
      setConnectionStatus('disconnected');
      return null;
    } finally {
      pendingActionRef.current = null;
      setGameState(prev => ({ ...prev, pendingAction: null }));
    }
  }, [toast]);

  /**
   * Request full state sync from server
   */
  const requestSync = useCallback(async () => {
    if (!gameState.roomId || !user) return;

    console.log('[ServerAuth] Requesting sync...');
    const action = createAction('request_sync', gameState.roomId, user.id);
    const response = await sendServerAction(action);

    if (response?.type === 'SYNC') {
      const payload = response.payload as SyncPayload;
      applyServerState(payload.gameState);
      console.log('[ServerAuth] Synced to version:', payload.gameState.version);
    }
  }, [gameState.roomId, user, sendServerAction]);

  /**
   * Apply authoritative server state
   */
  const applyServerState = useCallback((serverState: ServerGameState) => {
    const isMyTurn = user ? serverState.players[serverState.currentTurn]?.id === user.id : false;
    
    setGameState(prev => ({
      ...prev,
      players: serverState.players as Player[],
      currentTurn: serverState.currentTurn,
      diceValue: serverState.diceValue,
      phase: serverState.phase as 'waiting' | 'playing' | 'result',
      canRoll: isMyTurn && !prev.isRolling,
      canMove: false,
      isRolling: false,
      serverVersion: serverState.version,
      lastServerSync: Date.now(),
      captureAnimation: serverState.pendingCapture ? {
        isActive: true,
        position: { x: 0, y: 0 },
        capturedColor: serverState.pendingCapture.capturedColor
      } : null
    }));
  }, [user]);

  // ===== SUBSCRIBE TO SERVER EVENTS (Sticky session per match) =====
  
  const subscribeToServerEvents = useCallback((roomId: string) => {
    // STICKY SESSION: Only remove if switching rooms, not on reconnect
    if (serverChannelRef.current) {
      const existingChannelName = `ludo-server-${lastRoomIdRef.current}`;
      const newChannelName = `ludo-server-${roomId}`;
      
      // Only cleanup if actually switching to a different room
      if (existingChannelName !== newChannelName) {
        console.log('[ServerAuth] Switching rooms, cleaning up old channel');
        supabase.removeChannel(serverChannelRef.current);
        serverChannelRef.current = null;
      } else if (serverChannelRef.current.state === 'joined') {
        // Already connected to same room, skip resubscription
        console.log('[ServerAuth] Already subscribed to room, reusing channel');
        setConnectionStatus('connected');
        return;
      }
    }

    console.log(`[ServerAuth] Creating sticky channel for room: ${roomId} (session: ${sessionIdRef.current})`);
    
    const channel = supabase
      .channel(`ludo-server-${roomId}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: sessionIdRef.current } // Use session ID for sticky presence
        }
      })
      .on('broadcast', { event: 'server_event' }, (payload) => {
        const message = payload.payload as ServerMessage;
        handleServerEvent(message);
      })
      .subscribe((status) => {
        console.log('[ServerAuth] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          missedHeartbeatsRef.current = 0;
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    serverChannelRef.current = channel;
  }, []);

  /**
   * Set animation lock on client side (mirrors server)
   */
  const setClientAnimationLock = useCallback((lockUntil: number, lockType: 'DICE_ROLL' | 'TOKEN_MOVE' | 'CAPTURE') => {
    const now = Date.now();
    const lockDuration = lockUntil - now;
    
    if (lockDuration <= 0) return;
    
    setGameState(prev => ({
      ...prev,
      animationLock: {
        isLocked: true,
        lockUntil,
        lockType
      },
      canRoll: false,
      canMove: false
    }));
    
    // Clear the lock when it expires
    if (animationLockTimerRef.current) {
      clearTimeout(animationLockTimerRef.current);
    }
    
    animationLockTimerRef.current = setTimeout(() => {
      setGameState(prev => {
        const isMyTurn = user ? prev.players[prev.currentTurn]?.id === user.id : false;
        return {
          ...prev,
          animationLock: {
            isLocked: false,
            lockUntil: 0,
            lockType: null
          },
          canRoll: isMyTurn && prev.phase === 'playing'
        };
      });
    }, lockDuration);
  }, [user]);

  /**
   * Handle server broadcast events
   */
  const handleServerEvent = useCallback((message: ServerMessage) => {
    console.log('[ServerAuth] Event:', message.type, 'v:', message.version);

    // Version validation
    const versionCheck = isValidVersion(message.version, gameState.serverVersion);
    if (!versionCheck.valid && versionCheck.needsSync) {
      console.warn('[ServerAuth] Version drift detected, requesting sync');
      requestSync();
      return;
    }

    switch (message.type) {
      // Handle animation lock from server
      case 'ANIMATION_LOCK' as any: {
        const payload = message.payload as { lockUntil: number; lockType: 'DICE_ROLL' | 'TOKEN_MOVE' | 'CAPTURE' };
        setClientAnimationLock(payload.lockUntil, payload.lockType);
        break;
      }
      
      case 'DICE_ROLL': {
        const payload = message.payload as DiceRollPayload & { animationLockUntil?: number };
        const isMyTurn = user?.id === payload.nextPlayerId;
        
        soundManager.playDiceResult(payload.diceValue);
        hapticManager.diceRoll();
        
        // Apply animation lock if provided
        if (payload.animationLockUntil) {
          setClientAnimationLock(payload.animationLockUntil, 'DICE_ROLL');
        }
        
        setGameState(prev => ({
          ...prev,
          diceValue: payload.diceValue,
          isRolling: false,
          canMove: payload.canMove && payload.playerId === user?.id && !prev.animationLock.isLocked,
          canRoll: !payload.canMove && isMyTurn && !prev.animationLock.isLocked,
          currentTurn: payload.currentTurn,
          serverVersion: message.version
        }));
        break;
      }

      case 'TOKEN_MOVE': {
        const payload = message.payload as TokenMovePayload & { animationLockUntil?: number };
        
        soundManager.playTokenMove();
        hapticManager.tokenMove();
        
        // Apply animation lock if provided
        if (payload.animationLockUntil) {
          setClientAnimationLock(payload.animationLockUntil, 'TOKEN_MOVE');
        }
        
        setGameState(prev => ({
          ...prev,
          players: payload.players as Player[],
          canMove: false,
          serverVersion: message.version
        }));
        break;
      }

      case 'CAPTURE': {
        const payload = message.payload as CapturePayload & { animationLockUntil?: number };
        
        soundManager.playCapture();
        hapticManager.tokenCapture();
        
        // Apply animation lock if provided
        if (payload.animationLockUntil) {
          setClientAnimationLock(payload.animationLockUntil, 'CAPTURE');
        }
        
        setGameState(prev => ({
          ...prev,
          players: payload.players as Player[],
          captureAnimation: {
            isActive: true,
            position: { x: 0, y: 0 },
            capturedColor: payload.capturedColor
          },
          serverVersion: message.version
        }));
        
        // Clear animation after delay
        setTimeout(() => {
          setGameState(prev => ({ ...prev, captureAnimation: null }));
        }, 1000);
        break;
      }

      case 'TURN_SWITCH': {
        const payload = message.payload as TurnSwitchPayload;
        const isMyTurn = user?.id === payload.currentTurn;
        
        if (payload.reason !== 'ROLLED_SIX' && payload.reason !== 'CAPTURE_BONUS') {
          soundManager.playTurnChange();
        }
        
        setGameState(prev => ({
          ...prev,
          currentTurn: payload.turnIndex,
          // Only enable roll if animation is not locked
          canRoll: isMyTurn && !prev.animationLock.isLocked,
          canMove: false,
          serverVersion: message.version
        }));
        break;
      }

      case 'GAME_END': {
        const payload = message.payload as GameEndPayload;
        
        const isWinner = payload.winner.id === user?.id;
        if (isWinner) {
          soundManager.playWin();
          hapticManager.gameWin();
        } else {
          soundManager.playLose();
          hapticManager.gameLose();
        }
        
        setGameState(prev => ({
          ...prev,
          phase: 'result',
          winner: payload.finalState.players.find(p => p.id === payload.winner.id) as Player || null,
          canRoll: false,
          canMove: false,
          serverVersion: message.version
        }));
        break;
      }
    }
  }, [user, gameState.serverVersion, requestSync]);

  // ===== GAME ACTIONS (Optimistic Animations for Ludo King feel) =====

  /**
   * Calculate estimated token position for optimistic animation
   */
  const calculateEstimatedPosition = useCallback((token: Token, diceValue: number): number => {
    if (token.position === 0) {
      return diceValue === 6 ? 1 : 0; // Can only exit with 6
    }
    const newPos = token.position + diceValue;
    return newPos <= 57 ? newPos : token.position; // Don't exceed home
  }, []);

  /**
   * Roll dice - with OPTIMISTIC animation (Ludo King feel)
   * Shows dice rolling immediately, server confirms value after
   */
  const rollDice = useCallback(async () => {
    // Check animation lock first
    if (gameState.animationLock.isLocked || gameState.optimisticAnimation.isDiceAnimating) {
      console.log('[ServerAuth] Action blocked: animation in progress');
      return;
    }
    
    if (!gameState.canRoll || gameState.isRolling || !user || !gameState.roomId) {
      return;
    }

    // Lockstep validation
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer?.id !== user.id) {
      console.warn('[ServerAuth] Not your turn');
      toast({ title: 'Not your turn!', variant: 'destructive' });
      return;
    }

    console.log('[ServerAuth] Rolling dice (optimistic)...');
    
    // OPTIMISTIC: Start dice animation IMMEDIATELY (before server response)
    const animationStartTime = Date.now();
    setGameState(prev => ({ 
      ...prev, 
      isRolling: true, 
      canRoll: false,
      optimisticAnimation: {
        ...prev.optimisticAnimation,
        isDiceAnimating: true,
        diceAnimationStart: animationStartTime,
        pendingDiceValue: null,
        serverDiceConfirmed: false
      }
    }));
    
    // Play dice sound immediately for instant feedback
    soundManager.playDiceResult(1); // Placeholder sound, real sound plays on confirm
    hapticManager.diceRoll();

    // Send to server (async, don't block animation)
    const action = createAction('roll_dice', gameState.roomId, user.id);
    const response = await sendServerAction(action);

    if (!response) {
      // Revert on failure - but respect minimum animation time
      const elapsed = Date.now() - animationStartTime;
      const remainingTime = Math.max(0, SERVER_SYNC_CONFIG.OPTIMISTIC_DICE_DURATION_MS - elapsed);
      
      setTimeout(() => {
        setGameState(prev => ({ 
          ...prev, 
          isRolling: false, 
          canRoll: true,
          optimisticAnimation: {
            ...prev.optimisticAnimation,
            isDiceAnimating: false,
            serverDiceConfirmed: false
          }
        }));
        toast({ title: 'Failed to roll', description: 'Please try again', variant: 'destructive' });
      }, remainingTime);
      return;
    }
    
    // Handle rate limit / animation lock errors specifically
    if (response.type === 'ERROR') {
      const error = (response as any).error;
      const elapsed = Date.now() - animationStartTime;
      const remainingTime = Math.max(0, 300 - elapsed);
      
      setTimeout(() => {
        setGameState(prev => ({ 
          ...prev, 
          isRolling: false, 
          canRoll: true,
          optimisticAnimation: {
            ...prev.optimisticAnimation,
            isDiceAnimating: false,
            serverDiceConfirmed: false
          }
        }));
        
        if (error === 'ANIMATION_LOCK' || error === 'ANIMATION_IN_PROGRESS') {
          toast({ title: 'Please wait', description: 'Animation in progress', variant: 'default' });
        } else if (error === 'ACTION_TOO_FAST' || error?.includes('RATE_LIMIT')) {
          toast({ title: 'Too fast!', description: 'Please slow down', variant: 'destructive' });
        }
      }, remainingTime);
      return;
    }

    // Server confirmed! Mark as confirmed but let animation complete
    const serverDiceValue = (response.payload as any)?.diceValue || 1;
    const elapsed = Date.now() - animationStartTime;
    const remainingAnimTime = Math.max(0, SERVER_SYNC_CONFIG.OPTIMISTIC_DICE_DURATION_MS - elapsed);
    
    // Store server value and finish animation after minimum time
    setGameState(prev => ({
      ...prev,
      optimisticAnimation: {
        ...prev.optimisticAnimation,
        pendingDiceValue: serverDiceValue,
        serverDiceConfirmed: true
      }
    }));
    
    // After animation completes, apply final server state
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        diceValue: serverDiceValue,
        isRolling: false,
        optimisticAnimation: {
          ...prev.optimisticAnimation,
          isDiceAnimating: false
        }
      }));
      // Play final dice sound with actual value
      soundManager.playDiceResult(serverDiceValue);
    }, remainingAnimTime);
    
  }, [gameState, user, sendServerAction, toast]);

  /**
   * Move token - with OPTIMISTIC animation (Ludo King feel)
   * Shows token moving immediately, server validates after
   */
  const handleTokenClick = useCallback(async (color: string, tokenId: number) => {
    // Check animation lock first
    if (gameState.animationLock.isLocked || gameState.optimisticAnimation.isTokenAnimating) {
      console.log('[ServerAuth] Action blocked: animation in progress');
      return;
    }
    
    if (!gameState.canMove || !user || !gameState.roomId) {
      return;
    }

    // Lockstep validation
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer?.id !== user.id || currentPlayer.color !== color) {
      return;
    }
    
    // Find the token for optimistic position calculation
    const token = currentPlayer.tokens.find(t => t.id === tokenId);
    if (!token) return;
    
    const estimatedNewPosition = calculateEstimatedPosition(token, gameState.diceValue);

    console.log('[ServerAuth] Moving token (optimistic):', tokenId, '->', estimatedNewPosition);
    
    // OPTIMISTIC: Start move animation IMMEDIATELY
    const animationStartTime = Date.now();
    setGameState(prev => ({ 
      ...prev, 
      canMove: false,
      optimisticAnimation: {
        ...prev.optimisticAnimation,
        isTokenAnimating: true,
        tokenAnimationStart: animationStartTime,
        pendingTokenMove: {
          tokenId,
          color,
          fromPosition: token.position,
          estimatedToPosition: estimatedNewPosition
        },
        serverMoveConfirmed: false
      }
    }));
    
    // Play move sound immediately for instant feedback
    soundManager.playTokenMove();
    hapticManager.tokenMove();

    const action = createAction('move_token', gameState.roomId, user.id, tokenId);
    const response = await sendServerAction(action);

    if (!response || response.type === 'ERROR') {
      // Revert on failure - but respect minimum animation time for smooth rollback
      const elapsed = Date.now() - animationStartTime;
      const remainingTime = Math.max(0, 300 - elapsed);
      
      setTimeout(() => {
        setGameState(prev => ({ 
          ...prev, 
          canMove: true,
          optimisticAnimation: {
            ...prev.optimisticAnimation,
            isTokenAnimating: false,
            pendingTokenMove: null,
            serverMoveConfirmed: false
          }
        }));
        
        const error = (response as any)?.error;
        const errorMsg = (response?.payload as any)?.message || 'Invalid move';
        
        if (error === 'ANIMATION_LOCK' || error === 'ANIMATION_IN_PROGRESS') {
          toast({ title: 'Please wait', description: 'Animation in progress', variant: 'default' });
        } else if (error === 'ACTION_TOO_FAST' || error?.includes('RATE_LIMIT')) {
          toast({ title: 'Too fast!', description: 'Please slow down', variant: 'destructive' });
        } else if (error === 'DUPLICATE_ACTION') {
          console.log('[ServerAuth] Duplicate action ignored');
        } else {
          toast({ title: 'Move rejected', description: errorMsg, variant: 'destructive' });
        }
      }, remainingTime);
      return;
    }

    // Server confirmed! Complete animation smoothly
    const elapsed = Date.now() - animationStartTime;
    const remainingAnimTime = Math.max(0, SERVER_SYNC_CONFIG.OPTIMISTIC_MOVE_DURATION_MS - elapsed);
    
    setGameState(prev => ({
      ...prev,
      optimisticAnimation: {
        ...prev.optimisticAnimation,
        serverMoveConfirmed: true
      }
    }));
    
    // After animation completes, clear optimistic state (server broadcast will update real state)
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        optimisticAnimation: {
          ...prev.optimisticAnimation,
          isTokenAnimating: false,
          pendingTokenMove: null
        }
      }));
    }, remainingAnimTime);
    
  }, [gameState, user, sendServerAction, toast, calculateEstimatedPosition]);

  // ===== PRESENCE TRACKING =====
  
  const subscribeToPresence = useCallback((roomId: string) => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-presence-${roomId}`, {
        config: { presence: { key: user?.id || 'anonymous' } }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOpponentOnline(Object.keys(state).length >= 2);
      })
      .on('presence', { event: 'join' }, () => {
        setOpponentOnline(true);
        soundManager.playTurnChange();
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        setOpponentOnline(Object.keys(state).length >= 2);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    presenceChannelRef.current = channel;
  }, [user]);

  // ===== RECONNECT-RESYNC =====
  
  /**
   * Clean up stale WebSocket connections
   */
  const cleanupStaleConnections = useCallback(() => {
    console.log('[ServerAuth] Cleaning up stale connections...');
    
    // Remove existing channels before creating new ones
    if (serverChannelRef.current) {
      try {
        supabase.removeChannel(serverChannelRef.current);
      } catch (e) {
        console.warn('[ServerAuth] Error removing server channel:', e);
      }
      serverChannelRef.current = null;
    }
    
    if (presenceChannelRef.current) {
      try {
        supabase.removeChannel(presenceChannelRef.current);
      } catch (e) {
        console.warn('[ServerAuth] Error removing presence channel:', e);
      }
      presenceChannelRef.current = null;
    }
    
    if (chatChannelRef.current) {
      try {
        supabase.removeChannel(chatChannelRef.current);
      } catch (e) {
        console.warn('[ServerAuth] Error removing chat channel:', e);
      }
      chatChannelRef.current = null;
    }
  }, []);
  
  const attemptReconnection = useCallback(async () => {
    if (isReconnectingRef.current || !lastRoomIdRef.current) return;
    
    // Check max reconnection attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[ServerAuth] Max reconnection attempts reached');
      sonnerToast.error('Connection lost. Please rejoin the game.');
      setConnectionStatus('disconnected');
      return;
    }
    
    isReconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;
    setConnectionStatus('reconnecting');
    
    console.log(`[ServerAuth] Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}...`);
    
    // Clean up stale connections first
    cleanupStaleConnections();
    
    // Exponential backoff delay
    const backoffDelay = Math.min(
      SERVER_SYNC_CONFIG.RECONNECT_SYNC_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current - 1),
      5000
    );
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    // Resubscribe to channels
    subscribeToServerEvents(lastRoomIdRef.current!);
    subscribeToPresence(lastRoomIdRef.current!);
    
    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Request authoritative state from server (this also validates the room exists)
    await requestSync();
    
    // Reset attempts on successful reconnection
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
    setConnectionStatus('connected');
    sonnerToast.success('Reconnected!');
  }, [subscribeToServerEvents, subscribeToPresence, requestSync, cleanupStaleConnections]);

  // Online/offline detection + INSTANT foreground resync
  useEffect(() => {
    const handleOnline = () => {
      if (gameState.phase === 'playing' && connectionStatus === 'disconnected') {
        attemptReconnection();
      }
    };
    
    const handleOffline = () => {
      if (gameState.phase === 'playing') {
        setConnectionStatus('disconnected');
      }
    };
    
    // INSTANT foreground resync (Ludo King feel)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App went to background
        isAppInBackgroundRef.current = true;
        backgroundTimestampRef.current = Date.now();
        console.log('[ServerAuth] App moved to background');
      } else if (document.visibilityState === 'visible' && gameState.phase === 'playing') {
        // App came back to foreground - INSTANT resync
        isAppInBackgroundRef.current = false;
        const backgroundDuration = Date.now() - backgroundTimestampRef.current;
        console.log(`[ServerAuth] App returned to foreground after ${backgroundDuration}ms`);
        
        // Request sync immediately (no delay)
        if (gameState.roomId) {
          // If was in background for more than 5s, do full reconnection
          if (backgroundDuration > 5000) {
            console.log('[ServerAuth] Long background period, doing full reconnect...');
            missedHeartbeatsRef.current = 0;
            attemptReconnection();
          } else {
            // Quick sync for short background periods
            console.log('[ServerAuth] Quick resync after short background...');
            requestSync();
          }
        }
        
        // Reset heartbeat tracking
        missedHeartbeatsRef.current = 0;
        lastHeartbeatResponseRef.current = Date.now();
      }
    };
    
    // Also handle page focus for desktop
    const handleFocus = () => {
      if (gameState.phase === 'playing' && gameState.roomId) {
        // Light-touch sync on focus
        requestSync();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [gameState.phase, gameState.roomId, connectionStatus, attemptReconnection, requestSync]);
  
  // Periodic stale connection cleanup (every 30s during active game)
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      if (staleChannelCleanupRef.current) {
        clearInterval(staleChannelCleanupRef.current);
        staleChannelCleanupRef.current = null;
      }
      return;
    }
    
    staleChannelCleanupRef.current = setInterval(() => {
      // Check if channels are still active
      if (serverChannelRef.current) {
        const state = serverChannelRef.current.state;
        if (state !== 'joined') {
          console.warn('[ServerAuth] Server channel in bad state:', state);
          attemptReconnection();
        }
      }
    }, 30000);
    
    return () => {
      if (staleChannelCleanupRef.current) {
        clearInterval(staleChannelCleanupRef.current);
        staleChannelCleanupRef.current = null;
      }
    };
  }, [gameState.phase, attemptReconnection]);

  // ===== ROOM MANAGEMENT =====
  
  const startRoom = useCallback((
    roomId: string,
    roomCode: string,
    isHost: boolean,
    entryAmount: number,
    rewardAmount: number
  ) => {
    lastRoomIdRef.current = roomId;
    actionRateLimiter.reset();
    uiLatencyTracker.reset();
    
    setGameState(prev => ({
      ...prev,
      phase: 'waiting',
      roomId,
      roomCode,
      isHost,
      entryAmount,
      rewardAmount,
      serverVersion: 0
    }));

    subscribeToServerEvents(roomId);
    subscribeToPresence(roomId);
    
    // Initial sync after connection
    setTimeout(() => requestSync(), 500);
  }, [subscribeToServerEvents, subscribeToPresence, requestSync]);

  const resetGame = useCallback(() => {
    // Cleanup channels
    if (serverChannelRef.current) {
      supabase.removeChannel(serverChannelRef.current);
      serverChannelRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }

    // Reset state
    actionRateLimiter.reset();
    uiLatencyTracker.reset();
    lastRoomIdRef.current = null;

    setGameState({
      phase: 'idle',
      roomId: null,
      roomCode: null,
      isHost: false,
      players: [],
      currentTurn: 0,
      diceValue: 1,
      isRolling: false,
      canRoll: false,
      canMove: false,
      selectedToken: null,
      winner: null,
      entryAmount: 0,
      rewardAmount: 0,
      chatMessages: [],
      captureAnimation: null,
      rematchStatus: 'idle',
      rematchRequester: null,
      serverVersion: 0,
      lastServerSync: Date.now(),
      pendingAction: null,
      animationLock: {
        isLocked: false,
        lockUntil: 0,
        lockType: null
      },
      optimisticAnimation: {
        isDiceAnimating: false,
        diceAnimationStart: 0,
        pendingDiceValue: null,
        serverDiceConfirmed: false,
        isTokenAnimating: false,
        tokenAnimationStart: 0,
        pendingTokenMove: null,
        serverMoveConfirmed: false
      }
    });
    setOpponentOnline(false);
  }, []);

  // ===== FAST HEARTBEAT (5s interval, 3s timeout, 2 missed = disconnect) =====
  
  useEffect(() => {
    if (gameState.phase !== 'playing' || !gameState.roomId || !user) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      missedHeartbeatsRef.current = 0;
      return;
    }

    // Fast heartbeat for Ludo King-like responsiveness
    heartbeatIntervalRef.current = setInterval(async () => {
      // Skip heartbeat if app is in background
      if (isAppInBackgroundRef.current) {
        return;
      }
      
      const heartbeatStart = Date.now();
      const action = createAction('heartbeat', gameState.roomId!, user.id);
      
      // Race between heartbeat and timeout
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), SERVER_SYNC_CONFIG.HEARTBEAT_TIMEOUT_MS);
      });
      
      const response = await Promise.race([
        sendServerAction(action),
        timeoutPromise
      ]);
      
      if (!response) {
        missedHeartbeatsRef.current += 1;
        console.warn(`[ServerAuth] Heartbeat timeout (${missedHeartbeatsRef.current}/${SERVER_SYNC_CONFIG.MISSED_HEARTBEATS_DISCONNECT})`);
        
        // Fast disconnect detection
        if (missedHeartbeatsRef.current >= SERVER_SYNC_CONFIG.MISSED_HEARTBEATS_DISCONNECT) {
          console.error('[ServerAuth] Connection lost - too many missed heartbeats');
          setConnectionStatus('disconnected');
          attemptReconnection();
        }
      } else {
        // Heartbeat successful
        missedHeartbeatsRef.current = 0;
        lastHeartbeatResponseRef.current = Date.now();
        
        // Update latency display
        const latency = Date.now() - heartbeatStart;
        uiLatencyTracker.addSample(latency);
        setPingLatency(uiLatencyTracker.getDisplayLatency());
        
        if (connectionStatus !== 'connected') {
          setConnectionStatus('connected');
        }
      }
    }, SERVER_SYNC_CONFIG.HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [gameState.phase, gameState.roomId, user, sendServerAction, connectionStatus, attemptReconnection]);

  // ===== WALLET BALANCE =====
  
  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (data) {
        setWalletBalance(Number(data.wallet_balance));
      }
    };

    fetchBalance();
  }, [user]);

  // ===== RETURN INTERFACE =====
  
  return {
    gameState,
    setGameState,
    rollDice,
    handleTokenClick,
    startRoom,
    resetGame,
    requestSync,
    
    // Connection
    connectionStatus,
    pingLatency,
    opponentOnline,
    walletBalance,
    opponentDisconnectCountdown,
    
    // Compatibility with existing UI
    syncStatus: 'synced' as const,
    sendChatMessage: async () => {}, // TODO: Implement
    claimWinByDisconnect: async () => {}, // TODO: Implement
    extendDisconnectCountdown: () => {},
    skipCountdownAndClaimWin: () => {},
    triggerCaptureAnimation: () => {},
    clearCaptureAnimation: () => {},
    
    // Active room detection (compatibility)
    hasActiveFriendRoom: false,
    activeFriendRoomData: null,
    isCheckingActiveRoom: false,
    shouldAutoResumeFriend: false,
    resumeFriendRoom: async () => {},
    dismissActiveFriendRoom: async () => {},
    manualReconnect: attemptReconnection,
    reconnectAttempts: 0,
    connectionQuality: 'excellent' as const
  };
};

export default useServerAuthLudoGame;
