import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';
import { RealtimeChannel } from '@supabase/supabase-js';

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
}

interface RoomData {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  entry_amount: number;
  reward_amount: number;
  status: string;
  current_turn: number | null;
  game_state: GameStateData | null;
  winner_id: string | null;
  host_color: string | null;
  guest_color: string | null;
}

interface GameStateData {
  players: Player[];
  currentTurn: number;
  diceValue: number;
  phase: 'waiting' | 'playing' | 'result';
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  isEmoji: boolean;
  timestamp: Date;
}

interface FriendGameState {
  phase: 'idle' | 'waiting' | 'playing' | 'result';
  roomId: string | null;
  roomCode: string | null;
  isHost: boolean;
  players: Player[];
  currentTurn: number;
  diceValue: number;
  isRolling: boolean;
  canRoll: boolean;
  selectedToken: { color: string; tokenId: number } | null;
  winner: Player | null;
  entryAmount: number;
  rewardAmount: number;
  chatMessages: ChatMessage[];
  // Capture animation state
  captureAnimation: {
    isActive: boolean;
    position: { x: number; y: number };
    capturedColor: string;
  } | null;
  // Rematch state
  rematchStatus: 'idle' | 'pending' | 'accepted' | 'declined' | 'timeout';
  rematchRequester: string | null;
  // State checksum for desync detection
  stateChecksum: string | null;
  lastSyncTime: number;
}

const COLORS = ['red', 'green'];

// Simple checksum for state comparison
const generateChecksum = (players: Player[], currentTurn: number): string => {
  const stateString = JSON.stringify({
    tokens: players.map(p => p.tokens.map(t => t.position)),
    turn: currentTurn
  });
  let hash = 0;
  for (let i = 0; i < stateString.length; i++) {
    hash = ((hash << 5) - hash) + stateString.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(16);
};

export const useFriendLudoGame = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const rematchChannelRef = useRef<RealtimeChannel | null>(null);
  const syncChannelRef = useRef<RealtimeChannel | null>(null);
  const gameActionChannelRef = useRef<RealtimeChannel | null>(null); // NEW: instant action broadcast
  const checksumIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionRef = useRef<number>(0); // Prevent duplicate action processing
  
  // Reconnection handling refs
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const lastRoomIdRef = useRef<string | null>(null);
  const lastRoomCodeRef = useRef<string | null>(null);
  const lastIsHostRef = useRef<boolean>(false);
  const lastEntryAmountRef = useRef<number>(0);
  const lastRewardAmountRef = useRef<number>(0);

  const [gameState, setGameState] = useState<FriendGameState>({
    phase: 'idle',
    roomId: null,
    roomCode: null,
    isHost: false,
    players: [],
    currentTurn: 0,
    diceValue: 1,
    isRolling: false,
    canRoll: false,
    selectedToken: null,
    winner: null,
    entryAmount: 0,
    rewardAmount: 0,
    chatMessages: [],
    captureAnimation: null,
    rematchStatus: 'idle',
    rematchRequester: null,
    stateChecksum: null,
    lastSyncTime: Date.now()
  });

  const [syncStatus, setSyncStatus] = useState<'synced' | 'checking' | 'mismatch' | 'resyncing'>('synced');
  const [lastMismatchTime, setLastMismatchTime] = useState<number | null>(null);
  
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Ping/latency tracking
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPingsRef = useRef<Map<string, number>>(new Map());
  const lastHighPingWarningRef = useRef<number>(0);

  const [walletBalance, setWalletBalance] = useState(0);
  const [opponentOnline, setOpponentOnline] = useState(false);
  
  // Opponent disconnect timeout (1 minute = 60 seconds)
  const [opponentDisconnectCountdown, setOpponentDisconnectCountdown] = useState<number | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wallet balance
  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance, username, email')
        .eq('id', user.id)
        .single();

      if (data) {
        setWalletBalance(Number(data.wallet_balance));
      }
    };

    fetchBalance();
  }, [user]);

  const createInitialTokens = useCallback((color: string): Token[] => {
    return [0, 1, 2, 3].map(id => ({ id, position: 0, color }));
  }, []);

  // Subscribe to room updates
  const subscribeToRoom = useCallback((roomId: string) => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`ludo-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ludo_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          const roomData = payload.new as RoomData;
          handleRoomUpdate(roomData);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Subscribe to presence for opponent online status
  const subscribeToPresence = useCallback((roomId: string) => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-presence-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.keys(state).length;
        setOpponentOnline(onlineUsers >= 2);
      })
      .on('presence', { event: 'join' }, () => {
        setOpponentOnline(true);
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

  // Subscribe to chat messages via broadcast
  const subscribeToChatChannel = useCallback((roomId: string) => {
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-chat-${roomId}`)
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        setGameState(prev => ({
          ...prev,
          chatMessages: [...prev.chatMessages, { ...msg, timestamp: new Date(msg.timestamp) }]
        }));
      })
      .subscribe();

    chatChannelRef.current = channel;
  }, []);

  // NEW: Subscribe to game action broadcast for instant sync (like Ludo King)
  const subscribeToGameActions = useCallback((roomId: string) => {
    if (gameActionChannelRef.current) {
      supabase.removeChannel(gameActionChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-actions-${roomId}`)
      // Rolling start event - sync animation instantly
      .on('broadcast', { event: 'dice_rolling' }, (payload) => {
        const { senderId, timestamp } = payload.payload;
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          console.log('[LudoSync] Received dice rolling start - syncing animation');
          setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));
        }
      })
      .on('broadcast', { event: 'dice_roll' }, (payload) => {
        const { senderId, diceValue, timestamp } = payload.payload;
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[LudoSync] Received dice result:', diceValue);
          
          // Update immediately - animation was already synced via dice_rolling event
          setGameState(prev => {
            const player = prev.players[prev.currentTurn];
            const canMove = player?.tokens.some(token => {
              if (token.position === 0 && diceValue === 6) return true;
              if (token.position > 0 && token.position + diceValue <= 57) return true;
              return false;
            });

            if (!canMove) {
              const nextTurn = (prev.currentTurn + 1) % prev.players.length;
              const isMyTurn = prev.players[nextTurn]?.id === user?.id;
              soundManager.playDiceResult(diceValue);
              return { 
                ...prev, 
                diceValue, 
                isRolling: false, 
                currentTurn: nextTurn,
                canRoll: isMyTurn
              };
            }

            soundManager.playDiceResult(diceValue);
            return { ...prev, diceValue, isRolling: false };
          });
        }
      })
      .on('broadcast', { event: 'token_move' }, (payload) => {
        const { senderId, color, tokenId, newPlayers, nextTurn, gotSix, winnerId, timestamp } = payload.payload;
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[LudoSync] Received token move:', { color, tokenId });
          
          soundManager.playTokenMove();
          hapticManager.tokenMove();

          setGameState(prev => {
            const isMyTurn = newPlayers[nextTurn]?.id === user?.id;
            
            if (winnerId) {
              const winner = newPlayers.find((p: Player) => p.id === winnerId);
              return {
                ...prev,
                players: newPlayers,
                currentTurn: nextTurn,
                phase: 'result',
                winner,
                canRoll: false
              };
            }

            return {
              ...prev,
              players: newPlayers,
              currentTurn: nextTurn,
              canRoll: isMyTurn && !gotSix,
              selectedToken: null
            };
          });

          if (!gotSix) {
            soundManager.playTurnChange();
          }
        }
      })
      .on('broadcast', { event: 'full_sync' }, (payload) => {
        const { senderId, players, currentTurn, diceValue, phase, timestamp } = payload.payload;
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[LudoSync] Received full sync');
          
          setGameState(prev => {
            const isMyTurn = players[currentTurn]?.id === user?.id;
            return {
              ...prev,
              players,
              currentTurn,
              diceValue,
              phase,
              canRoll: isMyTurn,
              isRolling: false,
              lastSyncTime: Date.now()
            };
          });
        }
      })
      // Ping/Pong for latency measurement
      .on('broadcast', { event: 'ping' }, (payload) => {
        const { senderId, pingId, timestamp } = payload.payload;
        if (senderId !== user?.id) {
          // Respond with pong
          channel.send({
            type: 'broadcast',
            event: 'pong',
            payload: { senderId: user?.id, pingId, originalTimestamp: timestamp }
          });
        }
      })
      .on('broadcast', { event: 'pong' }, (payload) => {
        const { senderId, pingId, originalTimestamp } = payload.payload;
        if (senderId !== user?.id && pendingPingsRef.current.has(pingId)) {
          const latency = Date.now() - originalTimestamp;
          pendingPingsRef.current.delete(pingId);
          setPingLatency(latency);
          
          // Show warning if ping exceeds 300ms (but not more than once per 30 seconds)
          const now = Date.now();
          if (latency > 300 && now - lastHighPingWarningRef.current > 30000) {
            lastHighPingWarningRef.current = now;
            sonnerToast.error(`Poor connection: ${latency}ms latency`, {
              description: 'Game may lag. Check your network.',
              duration: 5000,
            });
          }
        }
      })
      .subscribe((status) => {
        console.log('[LudoSync] Game action channel status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          setReconnectAttempts(0);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    gameActionChannelRef.current = channel;
  }, [user]);

  // Ping interval for latency measurement (runs in waiting room AND during game)
  useEffect(() => {
    const isActivePhase = gameState.phase === 'playing' || gameState.phase === 'waiting';
    if (!isActivePhase || !gameActionChannelRef.current || !user) {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      return;
    }

    const sendPing = () => {
      if (!gameActionChannelRef.current) return;
      
      const pingId = `ping-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = Date.now();
      
      pendingPingsRef.current.set(pingId, timestamp);
      
      gameActionChannelRef.current.send({
        type: 'broadcast',
        event: 'ping',
        payload: { senderId: user.id, pingId, timestamp }
      });
      
      // Clean up old pending pings (> 5 seconds)
      const now = Date.now();
      pendingPingsRef.current.forEach((time, id) => {
        if (now - time > 5000) {
          pendingPingsRef.current.delete(id);
        }
      });
    };

    // Send initial ping
    sendPing();
    
    // Send ping every 3 seconds
    pingIntervalRef.current = setInterval(sendPing, 3000);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [gameState.phase, user]);

  // Broadcast game action instantly
  const broadcastAction = useCallback(async (event: string, payload: any) => {
    if (!gameActionChannelRef.current || !user) return;
    
    const timestamp = Date.now();
    lastActionRef.current = timestamp;
    
    await gameActionChannelRef.current.send({
      type: 'broadcast',
      event,
      payload: { ...payload, senderId: user.id, timestamp }
    });
  }, [user]);

  // Reconnection with exponential backoff
  const attemptReconnection = useCallback(() => {
    if (isReconnectingRef.current) return;
    if (!lastRoomIdRef.current) return;
    
    isReconnectingRef.current = true;
    setConnectionStatus('reconnecting');
    
    const maxAttempts = 5;
    const baseDelay = 1000; // 1 second
    
    const tryReconnect = () => {
      if (reconnectAttemptsRef.current >= maxAttempts) {
        toast({
          title: '❌ Connection Lost',
          description: 'Unable to reconnect. Please check your internet and refresh.',
          variant: 'destructive'
        });
        setConnectionStatus('disconnected');
        isReconnectingRef.current = false;
        return;
      }
      
      reconnectAttemptsRef.current += 1;
      setReconnectAttempts(reconnectAttemptsRef.current);
      
      console.log(`[LudoSync] Reconnection attempt ${reconnectAttemptsRef.current}/${maxAttempts}`);
      
      // Resubscribe to all channels
      if (lastRoomIdRef.current) {
        subscribeToRoom(lastRoomIdRef.current);
        subscribeToPresence(lastRoomIdRef.current);
        subscribeToChatChannel(lastRoomIdRef.current);
        subscribeToGameActions(lastRoomIdRef.current);
        
        // Fetch latest state from database
        fetchRoomState(lastRoomIdRef.current);
        
        // Check if reconnected after a short delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (connectionStatus !== 'connected') {
            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), 10000);
            reconnectTimeoutRef.current = setTimeout(tryReconnect, delay);
          } else {
            isReconnectingRef.current = false;
            toast({ title: '✅ Reconnected!', description: 'Game sync restored.' });
          }
        }, 2000);
      }
    };
    
    tryReconnect();
  }, [subscribeToRoom, subscribeToPresence, subscribeToChatChannel, subscribeToGameActions, connectionStatus, toast]);

  // Online/offline detection for automatic reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log('[LudoSync] Browser online');
      if (gameState.phase === 'playing' && connectionStatus === 'disconnected') {
        toast({ title: '🌐 Back Online', description: 'Reconnecting to game...' });
        attemptReconnection();
      }
    };
    
    const handleOffline = () => {
      console.log('[LudoSync] Browser offline');
      if (gameState.phase === 'playing') {
        setConnectionStatus('disconnected');
        toast({ 
          title: '⚠️ Connection Lost', 
          description: 'You are offline. Will reconnect automatically...',
          variant: 'destructive'
        });
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [gameState.phase, connectionStatus, attemptReconnection, toast]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
    attemptReconnection();
  }, [attemptReconnection]);

  // Claim win when opponent disconnects for too long
  const claimWinByDisconnect = useCallback(async () => {
    if (!user || !gameState.roomId || gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players.find(p => p.id === user.id);
    if (!currentPlayer) return;

    console.log('[LudoSync] Claiming win by opponent disconnect');
    
    // Update room status
    await supabase
      .from('ludo_rooms')
      .update({
        status: 'completed',
        winner_id: user.id,
        ended_at: new Date().toISOString()
      })
      .eq('id', gameState.roomId);

    // Credit reward to wallet
    await supabase.from('profiles').update({
      wallet_balance: walletBalance + gameState.rewardAmount
    }).eq('id', user.id);

    // Create transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'prize',
      amount: gameState.rewardAmount,
      status: 'completed',
      description: `Won Ludo match by opponent disconnect (Room: ${gameState.roomCode})`
    });

    setWalletBalance(prev => prev + gameState.rewardAmount);

    // Send notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: '🏆 Victory by Forfeit!',
      message: `Opponent disconnected. You won ₹${gameState.rewardAmount}!`,
      type: 'success'
    });

    // Update game state to show win
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      winner: currentPlayer,
      canRoll: false
    }));

    // Clear countdown
    setOpponentDisconnectCountdown(null);
    
    toast({
      title: '🏆 You Win!',
      description: 'Opponent was disconnected for too long.',
    });
  }, [user, gameState.roomId, gameState.phase, gameState.players, gameState.roomCode, gameState.rewardAmount, walletBalance, toast]);

  // Opponent disconnect countdown effect
  useEffect(() => {
    // Only run during active games
    if (gameState.phase !== 'playing') {
      // Clear any existing timers
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setOpponentDisconnectCountdown(null);
      return;
    }

    if (!opponentOnline) {
      // Opponent went offline - start 60 second countdown
      console.log('[LudoSync] Opponent offline - starting disconnect countdown');
      setOpponentDisconnectCountdown(60);
      
      // Start countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setOpponentDisconnectCountdown(prev => {
          if (prev === null || prev <= 1) {
            // Time's up - clear interval, claim win will be triggered separately
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } else {
      // Opponent is back online - clear countdown
      console.log('[LudoSync] Opponent back online - clearing countdown');
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setOpponentDisconnectCountdown(null);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [opponentOnline, gameState.phase]);

  // Auto-claim win when countdown reaches 0
  useEffect(() => {
    if (opponentDisconnectCountdown === 0 && gameState.phase === 'playing') {
      claimWinByDisconnect();
    }
  }, [opponentDisconnectCountdown, gameState.phase, claimWinByDisconnect]);


  // Send chat message
  const sendChatMessage = useCallback(async (message: string, isEmoji: boolean) => {
    if (!gameState.roomId || !user) return;

    const currentPlayer = gameState.players.find(p => p.id === user.id);
    const chatMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: user.id,
      senderName: currentPlayer?.name || 'You',
      message,
      isEmoji,
      timestamp: new Date()
    };

    // Add to local state immediately
    setGameState(prev => ({
      ...prev,
      chatMessages: [...prev.chatMessages, chatMessage]
    }));

    // Broadcast to other player
    if (chatChannelRef.current) {
      await chatChannelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: chatMessage
      });
    }
  }, [gameState.roomId, gameState.players, user]);

  // Handle room updates from database
  const handleRoomUpdate = useCallback((roomData: RoomData) => {
    if (!user) return;

    const isHost = roomData.host_id === user.id;

    // Room is cancelled
    if (roomData.status === 'cancelled') {
      toast({ title: 'Room cancelled', variant: 'destructive' });
      resetGame();
      return;
    }

    // Game completed
    if (roomData.status === 'completed' && roomData.winner_id) {
      const winnerId = roomData.winner_id;
      const isWinner = winnerId === user.id;
      
      setGameState(prev => {
        const winner = prev.players.find(p => p.id === winnerId);
        return {
          ...prev,
          phase: 'result',
          winner: winner || null
        };
      });
      return;
    }

    // Game in progress - sync state
    if (roomData.status === 'playing' && roomData.game_state) {
      const gameData = roomData.game_state as GameStateData;
      
      setGameState(prev => {
        const myPlayer = gameData.players.find(p => p.id === user.id);
        const isMyTurn = gameData.players[gameData.currentTurn]?.id === user.id;
        
        return {
          ...prev,
          phase: 'playing',
          players: gameData.players,
          currentTurn: gameData.currentTurn,
          diceValue: gameData.diceValue,
          canRoll: isMyTurn,
          isRolling: false
        };
      });
      
      soundManager.playTurnChange();
    }

    // Room is ready (both players joined) - start game
    if (roomData.status === 'ready' && roomData.guest_id) {
      // Only host initializes the game
      if (isHost) {
        initializeGame(roomData);
      }
    }
  }, [user, toast]);

  // Initialize game when both players are ready
  const initializeGame = async (roomData: RoomData) => {
    if (!user) return;

    const hostColor = 'red';
    const guestColor = 'green';

    // Fetch player names
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code')
      .eq('id', roomData.host_id)
      .single();

    const { data: guestProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code')
      .eq('id', roomData.guest_id!)
      .single();

    const hostName = hostProfile?.username || hostProfile?.email?.split('@')[0] || 'Host';
    const guestName = guestProfile?.username || guestProfile?.email?.split('@')[0] || 'Guest';
    const hostUid = hostProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();
    const guestUid = guestProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();

    const players: Player[] = [
      {
        id: roomData.host_id,
        name: hostName,
        uid: hostUid,
        isBot: false,
        color: hostColor,
        tokens: createInitialTokens(hostColor),
        tokensHome: 0
      },
      {
        id: roomData.guest_id!,
        name: guestName,
        uid: guestUid,
        isBot: false,
        color: guestColor,
        tokens: createInitialTokens(guestColor),
        tokensHome: 0
      }
    ];

    const gameData: GameStateData = {
      players,
      currentTurn: 0, // Host starts first
      diceValue: 1,
      phase: 'playing'
    };

    // Update room with game state
    await supabase
      .from('ludo_rooms')
      .update({
        status: 'playing',
        host_color: hostColor,
        guest_color: guestColor,
        current_turn: 0,
        game_state: gameData as any,
        started_at: new Date().toISOString()
      })
      .eq('id', roomData.id);
  };

  // Start room (called from FriendMultiplayer when room is created/joined)
  const startRoom = useCallback((roomId: string, roomCode: string, isHost: boolean, entryAmount: number, rewardAmount: number) => {
    // Store room details for reconnection
    lastRoomIdRef.current = roomId;
    lastRoomCodeRef.current = roomCode;
    lastIsHostRef.current = isHost;
    lastEntryAmountRef.current = entryAmount;
    lastRewardAmountRef.current = rewardAmount;
    
    setGameState(prev => ({
      ...prev,
      phase: 'waiting',
      roomId,
      roomCode,
      isHost,
      entryAmount,
      rewardAmount
    }));

    subscribeToRoom(roomId);
    subscribeToPresence(roomId);
    subscribeToChatChannel(roomId);
    subscribeToGameActions(roomId); // NEW: instant action sync

    // Fetch initial room state
    fetchRoomState(roomId);
  }, [subscribeToRoom, subscribeToPresence, subscribeToChatChannel, subscribeToGameActions]);

  // Fetch room state
  const fetchRoomState = async (roomId: string) => {
    const { data: roomData } = await supabase
      .from('ludo_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomData) {
      // Parse game_state from JSON
      const parsedRoom: RoomData = {
        ...roomData,
        game_state: roomData.game_state ? (roomData.game_state as unknown as GameStateData) : null
      };
      handleRoomUpdate(parsedRoom);
    }
  };


  // Generate dice value
  const generateDiceValue = useCallback((): number => {
    return Math.floor(Math.random() * 6) + 1;
  }, []);

  // Move token function
  const moveToken = useCallback((color: string, tokenId: number, diceValue: number, players: Player[]): { updatedPlayers: Player[]; winner: Player | null; gotSix: boolean; capturedOpponent: boolean } => {
    soundManager.playTokenMove();
    hapticManager.tokenMove();

    let winner: Player | null = null;
    let capturedOpponent = false;
    let newTokenPosition = 0;

    const movingPlayer = players.find(p => p.color === color);
    const movingToken = movingPlayer?.tokens.find(t => t.id === tokenId);

    if (movingToken) {
      if (movingToken.position === 0 && diceValue === 6) {
        newTokenPosition = 1;
      } else if (movingToken.position > 0) {
        newTokenPosition = Math.min(movingToken.position + diceValue, 57);
      }
    }

    const updatedPlayers = players.map(player => {
      if (player.color === color) {
        const updatedTokens = player.tokens.map(token => {
          if (token.id !== tokenId) return token;

          let newPosition = token.position;
          if (token.position === 0 && diceValue === 6) {
            newPosition = 1;
            soundManager.playTokenEnter();
            hapticManager.tokenEnter();
          } else if (token.position > 0) {
            newPosition = Math.min(token.position + diceValue, 57);
            if (newPosition === 57) {
              soundManager.playTokenHome();
              hapticManager.tokenHome();
            }
          }

          return { ...token, position: newPosition };
        });

        const tokensHome = updatedTokens.filter(t => t.position === 57).length;
        const updatedPlayer = { ...player, tokens: updatedTokens, tokensHome };

        if (tokensHome === 4) {
          winner = updatedPlayer;
        }

        return updatedPlayer;
      } else {
        // Check for capture
        const isSafePosition = newTokenPosition >= 52 || newTokenPosition === 0;

        if (!isSafePosition && newTokenPosition > 0) {
          const updatedTokens = player.tokens.map(token => {
            if (token.position === newTokenPosition && token.position > 0 && token.position < 52) {
              capturedOpponent = true;
              return { ...token, position: 0 };
            }
            return token;
          });
          return { ...player, tokens: updatedTokens };
        }

        return player;
      }
    });

    if (capturedOpponent) {
      setTimeout(() => {
        soundManager.playCapture();
        hapticManager.tokenCapture();
      }, 200);
    }

    return { updatedPlayers, winner, gotSix: diceValue === 6, capturedOpponent };
  }, []);

  // Sync game state to database
  const syncGameState = async (players: Player[], currentTurn: number, diceValue: number, winnerId?: string) => {
    if (!gameState.roomId) return;

    const gameData: GameStateData = {
      players,
      currentTurn,
      diceValue,
      phase: winnerId ? 'result' : 'playing'
    };

    const updateData: any = {
      game_state: gameData as any,
      current_turn: currentTurn
    };

    if (winnerId) {
      updateData.status = 'completed';
      updateData.winner_id = winnerId;
      updateData.ended_at = new Date().toISOString();
    }

    await supabase
      .from('ludo_rooms')
      .update(updateData)
      .eq('id', gameState.roomId);
  };

  // Roll dice
  const rollDice = useCallback(async () => {
    if (!gameState.canRoll || gameState.isRolling || !user) return;

    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer?.id !== user.id) return;

    // Broadcast rolling START immediately - opponent sees animation in sync
    broadcastAction('dice_rolling', {});
    
    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));

    // Generate dice value immediately but wait for animation
    const diceValue = generateDiceValue();
    
    await new Promise(resolve => setTimeout(resolve, 800));

    // Broadcast dice result - opponent updates immediately (already animated)
    broadcastAction('dice_roll', { diceValue });

    setGameState(prev => {
      const player = prev.players[prev.currentTurn];

      // Check if can move any token
      const canMove = player.tokens.some(token => {
        if (token.position === 0 && diceValue === 6) return true;
        if (token.position > 0 && token.position + diceValue <= 57) return true;
        return false;
      });

      if (!canMove) {
        // No valid moves, go to next turn
        const nextTurn = (prev.currentTurn + 1) % prev.players.length;
        
        // Sync to database (background)
        syncGameState(prev.players, nextTurn, diceValue);

        return { ...prev, diceValue, isRolling: false, currentTurn: nextTurn, canRoll: false };
      }

      return { ...prev, diceValue, isRolling: false };
    });
  }, [gameState.canRoll, gameState.isRolling, gameState.players, gameState.currentTurn, user, generateDiceValue, broadcastAction]);

  // Handle token click
  const handleTokenClick = useCallback((color: string, tokenId: number) => {
    if (!user) return;

    // Get current state for validation
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer || currentPlayer.color !== color || currentPlayer.id !== user.id || gameState.canRoll) return;

    const token = currentPlayer.tokens.find(t => t.id === tokenId);
    if (!token) return;

    const canMove =
      (token.position === 0 && gameState.diceValue === 6) ||
      (token.position > 0 && token.position + gameState.diceValue <= 57);

    if (!canMove) return;

    const { updatedPlayers, winner, gotSix } = moveToken(color, tokenId, gameState.diceValue, gameState.players);
    const nextTurn = gotSix ? gameState.currentTurn : (gameState.currentTurn + 1) % gameState.players.length;

    // Broadcast token move immediately to opponent
    broadcastAction('token_move', {
      color,
      tokenId,
      newPlayers: updatedPlayers,
      nextTurn,
      gotSix,
      winnerId: winner?.id || null
    });

    if (winner) {
      handleGameEnd(winner);
      syncGameState(updatedPlayers, gameState.currentTurn, gameState.diceValue, winner.id);
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        phase: 'result',
        winner,
        canRoll: false
      }));
      return;
    }

    if (gotSix) {
      syncGameState(updatedPlayers, gameState.currentTurn, gameState.diceValue);
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        canRoll: true,
        selectedToken: null
      }));
      return;
    }

    syncGameState(updatedPlayers, nextTurn, gameState.diceValue);
    soundManager.playTurnChange();

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      currentTurn: nextTurn,
      canRoll: false,
      selectedToken: null
    }));
  }, [user, gameState.players, gameState.currentTurn, gameState.canRoll, gameState.diceValue, moveToken, broadcastAction]);

  // Handle game end
  const handleGameEnd = async (winner: Player) => {
    if (!user || !gameState.roomId) return;

    const isUserWinner = winner.id === user.id;

    if (isUserWinner) {
      // Credit reward to wallet
      await supabase.from('profiles').update({
        wallet_balance: walletBalance + gameState.rewardAmount
      }).eq('id', user.id);

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'prize',
        amount: gameState.rewardAmount,
        status: 'completed',
        description: `Won Ludo match (Room: ${gameState.roomCode})`
      });

      setWalletBalance(prev => prev + gameState.rewardAmount);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🎉 Ludo Victory!',
        message: `You won ₹${gameState.rewardAmount} against your friend!`,
        type: 'success'
      });
    }
  };

  // Reset game
  const resetGame = useCallback(() => {
    // Clean up channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
    if (rematchChannelRef.current) {
      supabase.removeChannel(rematchChannelRef.current);
      rematchChannelRef.current = null;
    }
    if (gameActionChannelRef.current) {
      supabase.removeChannel(gameActionChannelRef.current);
      gameActionChannelRef.current = null;
    }
    if (syncChannelRef.current) {
      supabase.removeChannel(syncChannelRef.current);
      syncChannelRef.current = null;
    }

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
      selectedToken: null,
      winner: null,
      entryAmount: 0,
      rewardAmount: 0,
      chatMessages: [],
      captureAnimation: null,
      rematchStatus: 'idle',
      rematchRequester: null,
      stateChecksum: null,
      lastSyncTime: Date.now()
    });
    setOpponentOnline(false);
  }, []);

  // Trigger capture animation
  const triggerCaptureAnimation = useCallback((position: { x: number; y: number }, color: string) => {
    setGameState(prev => ({
      ...prev,
      captureAnimation: { isActive: true, position, capturedColor: color }
    }));
  }, []);

  // Clear capture animation
  const clearCaptureAnimation = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      captureAnimation: null
    }));
  }, []);

  // Force resync from database (auto or manual)
  const resyncGameState = useCallback(async (isAuto: boolean = false) => {
    if (!gameState.roomId) return;

    if (isAuto) {
      setSyncStatus('resyncing');
    } else {
      toast({ title: '🔄 Syncing...', description: 'Fetching latest game state' });
    }

    const { data: roomData } = await supabase
      .from('ludo_rooms')
      .select('*')
      .eq('id', gameState.roomId)
      .single();

    if (roomData && roomData.game_state) {
      const gameData = roomData.game_state as unknown as GameStateData;
      const isMyTurn = user ? gameData.players[gameData.currentTurn]?.id === user.id : false;
      const checksum = generateChecksum(gameData.players, gameData.currentTurn);

      setGameState(prev => ({
        ...prev,
        players: gameData.players,
        currentTurn: gameData.currentTurn,
        diceValue: gameData.diceValue,
        canRoll: isMyTurn,
        isRolling: false,
        stateChecksum: checksum,
        lastSyncTime: Date.now()
      }));

      setSyncStatus('synced');
      
      if (isAuto) {
        toast({ 
          title: '⚠️ State Mismatch Detected', 
          description: 'Game auto-resynced from server',
          variant: 'default'
        });
      } else {
        toast({ title: '✅ Synced!', description: 'Game state updated' });
      }
    }
  }, [gameState.roomId, user, toast]);

  // Subscribe to sync channel for checksum comparison
  const subscribeToSyncChannel = useCallback((roomId: string) => {
    if (syncChannelRef.current) {
      supabase.removeChannel(syncChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-sync-${roomId}`)
      .on('broadcast', { event: 'checksum' }, (payload) => {
        if (payload.payload.senderId !== user?.id) {
          // Compare checksums
          const myChecksum = gameState.stateChecksum;
          const theirChecksum = payload.payload.checksum;
          
          if (myChecksum && theirChecksum && myChecksum !== theirChecksum) {
            console.warn('[LudoSync] Checksum mismatch detected!', { mine: myChecksum, theirs: theirChecksum });
            setLastMismatchTime(Date.now());
            setSyncStatus('mismatch');
            
            // Auto-resync after short delay
            setTimeout(() => {
              resyncGameState(true);
            }, 500);
          }
        }
      })
      .subscribe();

    syncChannelRef.current = channel;
  }, [user, gameState.stateChecksum, resyncGameState]);

  // Broadcast checksum periodically during gameplay
  const broadcastChecksum = useCallback(() => {
    if (!syncChannelRef.current || !user || gameState.phase !== 'playing') return;
    
    const checksum = generateChecksum(gameState.players, gameState.currentTurn);
    
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'checksum',
      payload: { 
        senderId: user.id, 
        checksum,
        timestamp: Date.now()
      }
    });
  }, [user, gameState.players, gameState.currentTurn, gameState.phase]);

  // Start/stop checksum verification interval
  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.roomId) {
      // Subscribe to sync channel
      subscribeToSyncChannel(gameState.roomId);
      
      // Broadcast checksum every 1.5 seconds for faster sync detection
      checksumIntervalRef.current = setInterval(() => {
        broadcastChecksum();
      }, 1500);

      return () => {
        if (checksumIntervalRef.current) {
          clearInterval(checksumIntervalRef.current);
          checksumIntervalRef.current = null;
        }
      };
    }
  }, [gameState.phase, gameState.roomId, subscribeToSyncChannel, broadcastChecksum]);

  // Subscribe to rematch channel
  const subscribeToRematchChannel = useCallback((roomId: string) => {
    if (rematchChannelRef.current) {
      supabase.removeChannel(rematchChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-rematch-${roomId}`)
      .on('broadcast', { event: 'rematch_request' }, (payload) => {
        if (payload.payload.requesterId !== user?.id) {
          setGameState(prev => ({
            ...prev,
            rematchStatus: 'pending',
            rematchRequester: payload.payload.requesterId
          }));
        }
      })
      .on('broadcast', { event: 'rematch_response' }, async (payload) => {
        const { accepted } = payload.payload;
        setGameState(prev => ({
          ...prev,
          rematchStatus: accepted ? 'accepted' : 'declined'
        }));

        if (accepted) {
          // Start new game after short delay - host reinitializes
          setTimeout(async () => {
            setGameState(prev => {
              if (prev.isHost && prev.roomId) {
                // Host initializes the new game
                reinitializeGame(prev.roomId);
              }
              return {
                ...prev,
                rematchStatus: 'idle',
                rematchRequester: null,
              };
            });
          }, 1500);
        }
      })
      .subscribe();

    rematchChannelRef.current = channel;
  }, [user]);

  // Reinitialize game for rematch (host only)
  const reinitializeGame = async (roomId: string) => {
    if (!user) return;

    // Fetch current room data
    const { data: roomData, error } = await supabase
      .from('ludo_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !roomData || !roomData.guest_id) {
      toast({ title: 'Error', description: 'Could not restart game', variant: 'destructive' });
      return;
    }

    const hostColor = 'red';
    const guestColor = 'green';

    // Fetch player names
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code')
      .eq('id', roomData.host_id)
      .single();

    const { data: guestProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code')
      .eq('id', roomData.guest_id)
      .single();

    const hostName = hostProfile?.username || hostProfile?.email?.split('@')[0] || 'Host';
    const guestName = guestProfile?.username || guestProfile?.email?.split('@')[0] || 'Guest';
    const hostUid = hostProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();
    const guestUid = guestProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();

    const players: Player[] = [
      {
        id: roomData.host_id,
        name: hostName,
        uid: hostUid,
        isBot: false,
        color: hostColor,
        tokens: createInitialTokens(hostColor),
        tokensHome: 0
      },
      {
        id: roomData.guest_id,
        name: guestName,
        uid: guestUid,
        isBot: false,
        color: guestColor,
        tokens: createInitialTokens(guestColor),
        tokensHome: 0
      }
    ];

    const gameData: GameStateData = {
      players,
      currentTurn: 0,
      diceValue: 1,
      phase: 'playing'
    };

    // Update room with fresh game state
    await supabase
      .from('ludo_rooms')
      .update({
        status: 'playing',
        current_turn: 0,
        game_state: gameData as any,
        winner_id: null,
        started_at: new Date().toISOString(),
        ended_at: null
      })
      .eq('id', roomId);

    toast({ title: '🎮 Rematch Started!', description: 'New game begins!' });
  };

  // Request rematch
  const requestRematch = useCallback(async () => {
    if (!gameState.roomId || !rematchChannelRef.current || !user) return;

    setGameState(prev => ({
      ...prev,
      rematchStatus: 'pending',
      rematchRequester: user.id
    }));

    await rematchChannelRef.current.send({
      type: 'broadcast',
      event: 'rematch_request',
      payload: { requesterId: user.id }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      setGameState(prev => {
        if (prev.rematchStatus === 'pending' && prev.rematchRequester === user.id) {
          return { ...prev, rematchStatus: 'timeout' };
        }
        return prev;
      });
    }, 30000);
  }, [gameState.roomId, user]);

  // Respond to rematch
  const respondToRematch = useCallback(async (accepted: boolean) => {
    if (!rematchChannelRef.current) return;

    await rematchChannelRef.current.send({
      type: 'broadcast',
      event: 'rematch_response',
      payload: { accepted }
    });

    setGameState(prev => ({
      ...prev,
      rematchStatus: accepted ? 'accepted' : 'declined'
    }));
  }, []);

  // Subscribe to rematch when room starts
  useEffect(() => {
    if (gameState.roomId && gameState.phase !== 'idle') {
      subscribeToRematchChannel(gameState.roomId);
    }
  }, [gameState.roomId, gameState.phase, subscribeToRematchChannel]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
      }
      if (rematchChannelRef.current) {
        supabase.removeChannel(rematchChannelRef.current);
      }
      if (syncChannelRef.current) {
        supabase.removeChannel(syncChannelRef.current);
      }
      if (gameActionChannelRef.current) {
        supabase.removeChannel(gameActionChannelRef.current);
      }
      if (checksumIntervalRef.current) {
        clearInterval(checksumIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return {
    gameState,
    walletBalance,
    opponentOnline,
    opponentDisconnectCountdown,
    syncStatus,
    connectionStatus,
    reconnectAttempts,
    pingLatency,
    startRoom,
    rollDice,
    handleTokenClick,
    resetGame,
    sendChatMessage,
    triggerCaptureAnimation,
    clearCaptureAnimation,
    resyncGameState,
    requestRematch,
    respondToRematch,
    manualReconnect
  };
};
