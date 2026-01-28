import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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

  const [walletBalance, setWalletBalance] = useState(0);
  const [opponentOnline, setOpponentOnline] = useState(false);

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

    // Fetch initial room state
    fetchRoomState(roomId);
  }, [subscribeToRoom, subscribeToPresence, subscribeToChatChannel]);

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

    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));

    await new Promise(resolve => setTimeout(resolve, 800));

    const diceValue = generateDiceValue();

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
        
        // Sync to database
        syncGameState(prev.players, nextTurn, diceValue);

        return { ...prev, diceValue, isRolling: false, currentTurn: nextTurn, canRoll: false };
      }

      return { ...prev, diceValue, isRolling: false };
    });
  }, [gameState.canRoll, gameState.isRolling, gameState.players, gameState.currentTurn, user, generateDiceValue]);

  // Handle token click
  const handleTokenClick = useCallback((color: string, tokenId: number) => {
    if (!user) return;

    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentTurn];
      if (currentPlayer.color !== color || currentPlayer.id !== user.id || prev.canRoll) return prev;

      const token = currentPlayer.tokens.find(t => t.id === tokenId);
      if (!token) return prev;

      const canMove =
        (token.position === 0 && prev.diceValue === 6) ||
        (token.position > 0 && token.position + prev.diceValue <= 57);

      if (!canMove) return prev;

      const { updatedPlayers, winner, gotSix } = moveToken(color, tokenId, prev.diceValue, prev.players);

      if (winner) {
        // Handle win
        handleGameEnd(winner);
        syncGameState(updatedPlayers, prev.currentTurn, prev.diceValue, winner.id);
        
        return {
          ...prev,
          players: updatedPlayers,
          phase: 'result',
          winner,
          canRoll: false
        };
      }

      if (gotSix) {
        // Same player's turn again
        syncGameState(updatedPlayers, prev.currentTurn, prev.diceValue);
        
        return {
          ...prev,
          players: updatedPlayers,
          canRoll: true,
          selectedToken: null
        };
      }

      const nextTurn = (prev.currentTurn + 1) % prev.players.length;
      syncGameState(updatedPlayers, nextTurn, prev.diceValue);

      soundManager.playTurnChange();

      return {
        ...prev,
        players: updatedPlayers,
        currentTurn: nextTurn,
        canRoll: false,
        selectedToken: null
      };
    });
  }, [user, moveToken]);

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

  // Force resync from database
  const resyncGameState = useCallback(async () => {
    if (!gameState.roomId) return;

    toast({ title: 'Syncing...', description: 'Fetching latest game state' });

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

      toast({ title: '✅ Synced!', description: 'Game state updated' });
    }
  }, [gameState.roomId, user, toast]);

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
    };
  }, []);

  return {
    gameState,
    walletBalance,
    opponentOnline,
    startRoom,
    rollDice,
    handleTokenClick,
    resetGame,
    sendChatMessage,
    triggerCaptureAnimation,
    clearCaptureAnimation,
    resyncGameState,
    requestRematch,
    respondToRematch
  };
};
