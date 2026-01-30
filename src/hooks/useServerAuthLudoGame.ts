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
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPingsRef = useRef<Map<string, number>>(new Map());
  
  // Reconnection refs
  const lastRoomIdRef = useRef<string | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  
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
    pendingAction: null
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

  // ===== SUBSCRIBE TO SERVER EVENTS =====
  
  const subscribeToServerEvents = useCallback((roomId: string) => {
    if (serverChannelRef.current) {
      supabase.removeChannel(serverChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-server-${roomId}`, {
        config: {
          broadcast: { self: false, ack: false }
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
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    serverChannelRef.current = channel;
  }, []);

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
      case 'DICE_ROLL': {
        const payload = message.payload as DiceRollPayload;
        const isMyTurn = user?.id === payload.nextPlayerId;
        
        soundManager.playDiceResult(payload.diceValue);
        hapticManager.diceRoll();
        
        setGameState(prev => ({
          ...prev,
          diceValue: payload.diceValue,
          isRolling: false,
          canMove: payload.canMove && payload.playerId === user?.id,
          canRoll: !payload.canMove && isMyTurn,
          currentTurn: payload.currentTurn,
          serverVersion: message.version
        }));
        break;
      }

      case 'TOKEN_MOVE': {
        const payload = message.payload as TokenMovePayload;
        
        soundManager.playTokenMove();
        hapticManager.tokenMove();
        
        setGameState(prev => ({
          ...prev,
          players: payload.players as Player[],
          canMove: false,
          serverVersion: message.version
        }));
        break;
      }

      case 'CAPTURE': {
        const payload = message.payload as CapturePayload;
        
        soundManager.playCapture();
        hapticManager.tokenCapture();
        
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
          canRoll: isMyTurn,
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

  // ===== GAME ACTIONS =====

  /**
   * Roll dice - sends to server
   */
  const rollDice = useCallback(async () => {
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

    console.log('[ServerAuth] Rolling dice...');
    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));

    const action = createAction('roll_dice', gameState.roomId, user.id);
    const response = await sendServerAction(action);

    if (!response) {
      // Revert on failure
      setGameState(prev => ({ ...prev, isRolling: false, canRoll: true }));
      toast({ title: 'Failed to roll', description: 'Please try again', variant: 'destructive' });
      return;
    }

    // Server response handled via broadcast
  }, [gameState, user, sendServerAction, toast]);

  /**
   * Move token - sends to server for validation
   */
  const handleTokenClick = useCallback(async (color: string, tokenId: number) => {
    if (!gameState.canMove || !user || !gameState.roomId) {
      return;
    }

    // Lockstep validation
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer?.id !== user.id || currentPlayer.color !== color) {
      return;
    }

    console.log('[ServerAuth] Moving token:', tokenId);
    setGameState(prev => ({ ...prev, canMove: false }));

    const action = createAction('move_token', gameState.roomId, user.id, tokenId);
    const response = await sendServerAction(action);

    if (!response || response.type === 'ERROR') {
      // Revert on failure
      setGameState(prev => ({ ...prev, canMove: true }));
      const errorMsg = (response?.payload as any)?.message || 'Invalid move';
      toast({ title: 'Move rejected', description: errorMsg, variant: 'destructive' });
      return;
    }

    // Success - server response handled via broadcast
  }, [gameState, user, sendServerAction, toast]);

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
  
  const attemptReconnection = useCallback(async () => {
    if (isReconnectingRef.current || !lastRoomIdRef.current) return;
    
    isReconnectingRef.current = true;
    setConnectionStatus('reconnecting');
    
    console.log('[ServerAuth] Attempting reconnection...');
    
    // Resubscribe to channels
    subscribeToServerEvents(lastRoomIdRef.current);
    subscribeToPresence(lastRoomIdRef.current);
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, SERVER_SYNC_CONFIG.RECONNECT_SYNC_DELAY_MS));
    
    // Request authoritative state from server
    await requestSync();
    
    isReconnectingRef.current = false;
    sonnerToast.success('Reconnected!');
  }, [subscribeToServerEvents, subscribeToPresence, requestSync]);

  // Online/offline detection
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
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [gameState.phase, connectionStatus, attemptReconnection]);

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
      pendingAction: null
    });
    setOpponentOnline(false);
  }, []);

  // ===== HEARTBEAT =====
  
  useEffect(() => {
    if (gameState.phase !== 'playing' || !gameState.roomId || !user) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      const action = createAction('heartbeat', gameState.roomId!, user.id);
      const response = await sendServerAction(action);
      
      if (!response) {
        console.warn('[ServerAuth] Heartbeat failed');
      }
    }, SERVER_SYNC_CONFIG.HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [gameState.phase, gameState.roomId, user, sendServerAction]);

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
