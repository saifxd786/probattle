import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { soundManager } from '@/utils/soundManager';
// hapticManager removed - vibration disabled for Friend mode per user request
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  globalLatencyTracker, 
  globalChannelManager, 
  globalQoSManager,
  shortId,
  REALTIME_CONFIG 
} from '@/utils/realtimeOptimizer';
import {
  ludoSyncEngine,
  generateActionId,
  fastChecksum,
  SYNC_CONFIG
} from '@/utils/ludoSyncEngine';
import {
  ludoPredictiveAnimator,
  ANIMATION_TIMING
} from '@/utils/ludoPredictiveAnimator';
import {
  ultraLatencyPredictor,
  networkAnalyzer,
  connectionWarmer,
  HighPrecisionTimer,
  ultraShortId,
  ULTRA_CONFIG
} from '@/utils/ultraLowLatencyEngine';

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
  hasRolled: boolean; // Track if dice was rolled this turn (prevents re-roll exploit)
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

// ===== TRACK DEFINITIONS FOR COORDINATE-BASED CAPTURE =====
// Each player has their own track starting position
// CRITICAL: These must match LudoBoard.tsx exactly!

// LEFT_TRACK: Starts from LEFT side (1.5, 6.5) going right - RED uses this
const LEFT_TRACK: { x: number; y: number }[] = [
  { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
];

// TOP_TRACK: Starts from TOP (8.5, 1.5) going down - GREEN uses this
const TOP_TRACK: { x: number; y: number }[] = [
  { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
];

// Map colors to their correct tracks
const COLOR_TRACK_COORDS: { [color: string]: { x: number; y: number }[] } = {
  red: LEFT_TRACK,
  green: TOP_TRACK,
};

// Safe positions (board coordinates) - starting positions and safe spots
const SAFE_BOARD_POSITIONS = [
  { x: 1.5, y: 6.5 },   // Red start
  { x: 8.5, y: 1.5 },   // Green start
  { x: 2.5, y: 6.5 },   // Near red start (safe spot)
  { x: 8.5, y: 2.5 },   // Near green start (safe spot)
];

// Get board coordinates for a token position
const getBoardCoords = (position: number, color: string): { x: number; y: number } | null => {
  if (position <= 0 || position >= 52) return null; // Home or home stretch
  const track = COLOR_TRACK_COORDS[color];
  if (!track || position - 1 >= track.length) return null;
  return track[position - 1];
};

// Check if position is a safe spot
const isSafeBoardPosition = (coords: { x: number; y: number }): boolean => {
  return SAFE_BOARD_POSITIONS.some(safe => safe.x === coords.x && safe.y === coords.y);
};

// === LUDO KING-LEVEL SYNC CONFIGURATION ===
// Ultra-fast checksum for state comparison (uses FNV-1a from sync engine)
const generateChecksum = (players: Player[], currentTurn: number, diceValue?: number): string => {
  const stateString = JSON.stringify({
    tokens: players.map(p => ({
      color: p.color,
      positions: p.tokens.map(t => t.position).sort((a, b) => a - b),
      home: p.tokensHome
    })),
    turn: currentTurn,
    dice: diceValue || 0
  });
  return fastChecksum(stateString);
};

// Optimized constants from SYNC_CONFIG (esports-grade 20ms target)
const CHECKSUM_INTERVAL_MS = SYNC_CONFIG.RECONCILE_INTERVAL_MS; // 150ms for esports-grade sync
const CHECKSUM_MISMATCH_THRESHOLD = 3; // Allow 3 mismatches before resync (less sensitive)
const CHECKSUM_RESYNC_COOLDOWN_MS = 2000; // 2s cooldown to avoid spam

// Toast dedupe / anti-spam (Friends vs Friends)
const TOAST_ID_HIGH_LATENCY = 'ludo-high-latency';
const TOAST_ID_SYNC_RECOVERED = 'ludo-sync-recovered';
const AUTO_RESYNC_TOAST_COOLDOWN_MS = 30000; // 30s - avoid multiple "synced" popups

// Grace window to avoid checksum false-positives while an action is still in-flight
const CHECKSUM_IN_FLIGHT_GRACE_MS = 600; // Reduced for faster detection

// === ULTRA-LOW LATENCY (Sub-20ms TARGET) ===
const PING_INTERVAL_MS = 80; // 80ms pings for sub-20ms response tracking
const PING_TIMEOUT_MS = 400; // 400ms timeout (faster detection)
const HEARTBEAT_INTERVAL_MS = 600; // 600ms heartbeat
const HEARTBEAT_MISS_THRESHOLD = 3; // Allow 3 misses before disconnect
const MAX_PING_HISTORY = 80; // More samples for Kalman filter accuracy
const HIGH_PING_WARNING_THRESHOLD = 100; // Show warning at 100ms+ (esports-grade)
const HIGH_PING_WARNING_COOLDOWN = 60000; // 60 seconds between warnings (less spam)
const BROADCAST_RETRY_COUNT = 5; // More retries for reliability
const BROADCAST_RETRY_DELAY = 10; // 10ms retry delay (ultra-fast)

// Calculate median for more stable ping display (removes outliers)
const calculateMedian = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const useFriendLudoGame = () => {
  const { user, isRefreshing, lastUserId } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const rematchChannelRef = useRef<RealtimeChannel | null>(null);
  const syncChannelRef = useRef<RealtimeChannel | null>(null);
  const gameActionChannelRef = useRef<RealtimeChannel | null>(null); // NEW: instant action broadcast
  const checksumIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionRef = useRef<number>(0); // Prevent duplicate action processing
  const userIdRef = useRef<string | null>(null); // Track user ID for consistency
  
  // Enhanced desync detection refs
  const consecutiveMismatchesRef = useRef<number>(0);
  const lastResyncTimeRef = useRef<number>(0);
  const lastReceivedChecksumRef = useRef<string | null>(null);
  const checksumHistoryRef = useRef<{ checksum: string; timestamp: number }[]>([]);

  // Toast anti-spam refs
  const lastAutoResyncToastRef = useRef<number>(0);
  
  // Reconnection handling refs
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef<boolean>(false);
  const lastRoomIdRef = useRef<string | null>(null);
  const lastRoomCodeRef = useRef<string | null>(null);
  const lastIsHostRef = useRef<boolean>(false);
  const lastEntryAmountRef = useRef<number>(0);
  const lastRewardAmountRef = useRef<number>(0);
  const namesResolvedForRoomRef = useRef<string | null>(null);

  // Track user ID changes to prevent token mixups - but ignore during token refresh
  useEffect(() => {
    // Skip user ID change detection during token refresh
    if (isRefreshing) {
      console.log('[FriendLudo] Token refresh in progress - preserving game state');
      return;
    }
    
    if (user?.id) {
      if (userIdRef.current && userIdRef.current !== user.id) {
        // Check if this is just a token refresh (same user)
        if (lastUserId === user.id) {
          console.log('[FriendLudo] Same user after token refresh:', user.id);
          userIdRef.current = user.id;
          return;
        }
        
        console.warn('[FriendLudo] User ID changed during session!', {
          old: userIdRef.current,
          new: user.id,
          lastUserId
        });
        // This is a critical issue - user changed mid-game
        toast({
          title: '⚠️ Session Changed',
          description: 'Please rejoin the game room',
          variant: 'destructive'
        });
      }
      userIdRef.current = user.id;
      console.log('[FriendLudo] User ID set:', user.id);
    }
  }, [user?.id, isRefreshing, lastUserId, toast]);

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
    hasRolled: false,
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
  
  // Connection status state - enhanced for better monitoring
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Ping/latency tracking - enhanced for stability
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPingsRef = useRef<Map<string, number>>(new Map());
  const lastHighPingWarningRef = useRef<number>(0);
  const pingHistoryRef = useRef<number[]>([]); // Track last 10 pings for stability
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const heartbeatMissedRef = useRef<number>(0);

  const [walletBalance, setWalletBalance] = useState(0);
  const [opponentOnline, setOpponentOnline] = useState(false);
  
  // Turn timer state (15s per turn) - matching bot mode
  const [turnTimeLeft, setTurnTimeLeft] = useState(15);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Opponent disconnect timeout (1 minute = 60 seconds)
  const [opponentDisconnectCountdown, setOpponentDisconnectCountdown] = useState<number | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track opponent disconnect count - more than 3 = instant forfeit
  const [opponentDisconnectCount, setOpponentDisconnectCount] = useState(0);
  const MAX_DISCONNECT_COUNT = 3;

  // Active room detection for auto-resume
  const [hasActiveFriendRoom, setHasActiveFriendRoom] = useState(false);
  const [activeFriendRoomData, setActiveFriendRoomData] = useState<{
    roomId: string;
    roomCode: string;
    entryAmount: number;
    rewardAmount: number;
    isHost: boolean;
  } | null>(null);
  const [isCheckingActiveRoom, setIsCheckingActiveRoom] = useState(true);
  const [shouldAutoResumeFriend, setShouldAutoResumeFriend] = useState(false);

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

  // Check for active friend rooms on mount - DISABLED: No rejoin allowed in PvP
  // If player disconnects, opponent wins immediately
  useEffect(() => {
    if (!user) {
      setIsCheckingActiveRoom(false);
      return;
    }

    const checkActiveRoom = async () => {
      try {
        // Find any in-progress rooms where user is host or guest
        const { data: activeRoom, error } = await supabase
          .from('ludo_rooms')
          .select('*')
          .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
          .in('status', ['playing', 'ready'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[FriendLudo] Error checking active room:', error);
          setIsCheckingActiveRoom(false);
          return;
        }

        if (activeRoom && activeRoom.status === 'playing') {
          // Player disconnected from an active game - mark as forfeit
          console.log('[FriendLudo] Found abandoned room - forfeiting:', activeRoom.id);
          
          // Determine opponent
          const opponentId = activeRoom.host_id === user.id ? activeRoom.guest_id : activeRoom.host_id;
          
          if (opponentId) {
            // Mark room as completed with opponent as winner
            await supabase
              .from('ludo_rooms')
              .update({ 
                status: 'completed',
                winner_id: opponentId,
                ended_at: new Date().toISOString()
              })
              .eq('id', activeRoom.id);
            
            console.log('[FriendLudo] Forfeited room - opponent wins');
          }
          
          // Clear any local storage
          localStorage.removeItem(`ludo_friend_active_${activeRoom.id}`);
        } else if (activeRoom && activeRoom.status === 'waiting') {
          // Only allow resume for waiting rooms (before game started)
          const isHost = activeRoom.host_id === user.id;
          
          setHasActiveFriendRoom(true);
          setActiveFriendRoomData({
            roomId: activeRoom.id,
            roomCode: activeRoom.room_code,
            entryAmount: Number(activeRoom.entry_amount),
            rewardAmount: Number(activeRoom.reward_amount),
            isHost
          });
        }
      } catch (err) {
        console.error('[FriendLudo] Error checking active room:', err);
      } finally {
        setIsCheckingActiveRoom(false);
      }
    };

    checkActiveRoom();
  }, [user]);

  // Ensure we never show phone/email as player name inside an ongoing match, and always show avatars
  useEffect(() => {
    if (!gameState.roomId || gameState.phase !== 'playing') return;
    if (gameState.players.length === 0) return;
    
    // Check if any player is missing avatar or has generic "Player XXXXX" name
    const needsResolve = gameState.players.some(p => 
      !p.avatar || p.name.startsWith('Player ')
    );
    
    // Skip if already resolved for this room and all data is present
    if (namesResolvedForRoomRef.current === gameState.roomId && !needsResolve) return;

    const resolveNames = async () => {
      try {
        const ids = gameState.players.map(p => p.id).filter(Boolean);
        if (ids.length === 0) return;
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, user_code, avatar_url')
          .in('id', ids);

        if (!profiles || profiles.length === 0) return;

        const byId = new Map((profiles || []).map(p => [p.id, p]));

        setGameState(prev => {
          const updatedPlayers = prev.players.map(p => {
            const prof = byId.get(p.id);
            if (!prof) return p;
            const uid = (prof.user_code || p.uid || '').toString();
            const safeName = prof.username || (uid ? `Player ${uid}` : 'Player');
            return { 
              ...p, 
              uid: uid || p.uid, 
              name: safeName,
              avatar: prof.avatar_url || p.avatar || undefined
            };
          });
          return { ...prev, players: updatedPlayers };
        });
        
        // Mark as resolved after successful fetch
        namesResolvedForRoomRef.current = gameState.roomId;
      } catch (e) {
        console.warn('[FriendLudo] Failed to resolve player display names', e);
      }
    };

    resolveNames();
  }, [gameState.roomId, gameState.phase, gameState.players]);

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

  // Subscribe to presence for opponent online status with enhanced heartbeat
  const subscribeToPresence = useCallback((roomId: string) => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-presence-${roomId}`, {
        config: {
          presence: {
            key: user?.id || 'anonymous',
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineCount = Object.keys(state).length;
        setOpponentOnline(onlineCount >= 2);
        
        // Update last heartbeat time when we get presence sync
        lastHeartbeatRef.current = Date.now();
        heartbeatMissedRef.current = 0;
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[LudoPresence] Player joined:', key);
        setOpponentOnline(true);
        lastHeartbeatRef.current = Date.now();
        heartbeatMissedRef.current = 0;
        
        // Play sound when opponent joins
        soundManager.playTurnChange();
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[LudoPresence] Player left:', key);
        const state = channel.presenceState();
        setOpponentOnline(Object.keys(state).length >= 2);
      })
      .subscribe(async (status) => {
        console.log('[LudoPresence] Channel status:', status);
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            last_heartbeat: Date.now()
          });
          
          // Start heartbeat interval - track presence every 2 seconds (optimized)
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(async () => {
            try {
              await channel.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
                last_heartbeat: Date.now()
              });
              lastHeartbeatRef.current = Date.now();
              heartbeatMissedRef.current = 0;
            } catch (err) {
              console.warn('[LudoPresence] Heartbeat failed:', err);
              heartbeatMissedRef.current++;
              
              // If we miss heartbeats, mark as disconnected (faster detection)
              if (heartbeatMissedRef.current >= HEARTBEAT_MISS_THRESHOLD) {
                setConnectionStatus('disconnected');
              }
            }
          }, HEARTBEAT_INTERVAL_MS);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
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

  // Subscribe to game action broadcast for instant sync - LUDO KING OPTIMIZED
  const subscribeToGameActions = useCallback((roomId: string) => {
    if (gameActionChannelRef.current) {
      supabase.removeChannel(gameActionChannelRef.current);
    }

    // Create channel with Ludo King-level optimization
    const channel = supabase
      .channel(`ludo-actions-${roomId}`, {
        config: {
          broadcast: {
            self: false, // Don't receive own broadcasts
            ack: false, // Disable acknowledgments for sub-50ms delivery
          },
        },
      })
      // Predictive dice animation - syncs rolling state INSTANTLY
      .on('broadcast', { event: 'dice_rolling' }, (payload) => {
        const senderId = payload.payload.senderId || payload.payload.s;
        const timestamp = payload.payload.timestamp || payload.payload.t;
        const predictedValue = payload.payload.predictedValue;
        
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          console.log('[UltraLatency] Dice rolling animation sync');
          // Start animation immediately - sub-20ms response
          setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));
          ludoPredictiveAnimator.startDiceRoll();
        }
      })
      .on('broadcast', { event: 'dice_roll' }, (payload) => {
        const senderId = payload.payload.senderId || payload.payload.s;
        const diceValue = payload.payload.diceValue;
        const timestamp = payload.payload.timestamp || payload.payload.t;
        const actionId = payload.payload.actionId || payload.payload.a;
        
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[UltraLatency] Dice result:', diceValue);
          
          // Confirm predictive animation
          ludoPredictiveAnimator.confirmDiceRoll(diceValue);
          
          // Send action confirmation for optimistic update tracking
          if (actionId && gameActionChannelRef.current) {
            gameActionChannelRef.current.send({
              type: 'broadcast',
              event: 'action_confirm',
              payload: { actionId, senderId: user?.id }
            });
          }
          
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
              if (globalQoSManager.shouldPlaySounds()) {
                soundManager.playDiceResult(diceValue);
              }
              return { 
                ...prev, 
                diceValue, 
                isRolling: false, 
                hasRolled: false, // Reset for next turn
                currentTurn: nextTurn,
                canRoll: isMyTurn
              };
            }

            if (globalQoSManager.shouldPlaySounds()) {
              soundManager.playDiceResult(diceValue);
            }
            // Opponent rolled - set hasRolled true (they need to move a token now)
            return { ...prev, diceValue, isRolling: false, hasRolled: true };
          });
        }
      })
      .on('broadcast', { event: 'token_move' }, (payload) => {
        // Support both old and new payload formats
        const senderId = payload.payload.senderId || payload.payload.s;
        const timestamp = payload.payload.timestamp || payload.payload.t;
        const actionId = payload.payload.actionId || payload.payload.a;
        const { color, tokenId, newPlayers, nextTurn, gotSix, winnerId } = payload.payload;
        
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[UltraLatency] Token move:', { color, tokenId });
          
          // Confirm predictive animation
          if (newPlayers) {
            const movedToken = newPlayers.find((p: Player) => p.color === color)?.tokens.find((t: Token) => t.id === tokenId);
            if (movedToken) {
              ludoPredictiveAnimator.confirmTokenMove(color, tokenId, movedToken.position);
            }
          }
          
          // Send action confirmation
          if (actionId && gameActionChannelRef.current) {
            gameActionChannelRef.current.send({
              type: 'broadcast',
              event: 'action_confirm',
              payload: { actionId, senderId: user?.id }
            });
          }
          
          // QoS-aware feedback
          if (globalQoSManager.shouldPlaySounds()) {
            soundManager.playTokenMove();
          }

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
                canRoll: false,
                hasRolled: false
              };
            }

            // Reset hasRolled when turn changes, keep it true if got six (same player continues)
            return {
              ...prev,
              players: newPlayers,
              currentTurn: nextTurn,
              canRoll: isMyTurn && !gotSix,
              hasRolled: gotSix ? true : false, // Reset when turn switches
              selectedToken: null
            };
          });

          if (!gotSix) {
            soundManager.playTurnChange();
          }
        }
      })
      // Listen for explicit forfeit (exit) from opponent - give immediate win
      .on('broadcast', { event: 'player_forfeit' }, (payload) => {
        const senderId = payload.payload.senderId || payload.payload.s;
        const timestamp = payload.payload.timestamp || payload.payload.t;
        
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[LudoSync] Opponent forfeited! Claiming immediate win');
          
          // Clear any disconnect countdown
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setOpponentDisconnectCountdown(null);
          
          // Immediately claim win - no waiting
          claimWinByForfeit();
        }
      })
      .on('broadcast', { event: 'turn_timeout' }, (payload) => {
        const senderId = payload.payload.senderId || payload.payload.s;
        const { fromTurn, toTurn, reason } = payload.payload;
        const timestamp = payload.payload.timestamp || payload.payload.t;
        
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[LudoTimer] Received turn_timeout from opponent', { fromTurn, toTurn, reason });
          
          setGameState(prev => {
            const isMyTurn = prev.players[toTurn]?.id === user?.id;
            return {
              ...prev,
              currentTurn: toTurn,
              canRoll: isMyTurn,
              hasRolled: false,
              selectedToken: null
            };
          });
          
          soundManager.playTurnChange();
          sonnerToast.info('Opponent\'s time expired', {
            description: 'Your turn now!',
            duration: 2000
          });
        }
      })
      .on('broadcast', { event: 'full_sync' }, (payload) => {
        const { senderId, players, currentTurn, diceValue, phase, hasRolled, timestamp } = payload.payload;
        if (senderId !== user?.id && timestamp > lastActionRef.current) {
          lastActionRef.current = timestamp;
          console.log('[LudoSync] Received full sync');
          
          setGameState(prev => {
            const isMyTurn = players[currentTurn]?.id === user?.id;
            // Only allow roll if it's my turn AND dice hasn't been rolled this turn
            const canRollNow = isMyTurn && !hasRolled;
            return {
              ...prev,
              players,
              currentTurn,
              diceValue,
              phase,
              canRoll: canRollNow,
              hasRolled: hasRolled || false,
              isRolling: false,
              lastSyncTime: Date.now()
            };
          });
        }
      })
      // Ping/Pong for ultra-low latency measurement - Ludo King style
      .on('broadcast', { event: 'ping' }, (payload) => {
        // Support both old and new ping formats
        const senderId = payload.payload.senderId || payload.payload.s;
        const pingId = payload.payload.pingId || payload.payload.p;
        const timestamp = payload.payload.timestamp || payload.payload.t;
        
        if (senderId !== user?.id) {
          // Respond with pong IMMEDIATELY using minimal payload
          channel.send({
            type: 'broadcast',
            event: 'pong',
            payload: { s: user?.id, p: pingId, o: timestamp, r: HighPrecisionTimer.timestamp() }
          });
        }
      })
      .on('broadcast', { event: 'pong' }, (payload) => {
        // Support both old and new pong formats
        const senderId = payload.payload.senderId || payload.payload.s;
        const pingId = payload.payload.pingId || payload.payload.p;
        const originalTimestamp = payload.payload.originalTimestamp || payload.payload.o;
        
        if (senderId !== user?.id && pendingPingsRef.current.has(pingId)) {
          // Use high-precision timing for sub-20ms accuracy
          const receiveTime = HighPrecisionTimer.now();
          const sendTime = pendingPingsRef.current.get(pingId)!;
          const latency = Date.now() - originalTimestamp;
          pendingPingsRef.current.delete(pingId);
          
          // Feed into Kalman filter for professional prediction
          const predictedLatency = ultraLatencyPredictor.update(latency);
          networkAnalyzer.recordPing(latency);
          
          // Also feed legacy systems for compatibility
          globalLatencyTracker.addSample(latency);
          ludoSyncEngine.recordLatency(latency);
          
          const stats = globalLatencyTracker.getStats();
          const quality = globalLatencyTracker.getQuality();
          
          // Track locally for backwards compatibility
          pingHistoryRef.current.push(latency);
          if (pingHistoryRef.current.length > MAX_PING_HISTORY) {
            pingHistoryRef.current.shift();
          }
          
          // Use Kalman-filtered smoothed latency for ultra-stable display
          const smoothedLatency = ultraLatencyPredictor.getSmoothedLatency();
          setPingLatency(prev => {
            if (prev === null) return Math.round(smoothedLatency);
            // Ultra-smooth EMA with 0.9 weight for 20ms target responsiveness
            return Math.round(prev * 0.1 + smoothedLatency * 0.9);
          });
          
          // Update QoS manager with quality
          const localQuality = quality === 'disconnected' ? 'poor' : quality;
          setConnectionQuality(localQuality);
          globalQoSManager.updateQuality(quality);
          
          // Update channel health
          globalChannelManager.markActivity(`ludo-actions-${gameState.roomId}`, 'receive');
          
          // Reset heartbeat on successful pong
          lastHeartbeatRef.current = Date.now();
          heartbeatMissedRef.current = 0;
          setConnectionStatus('connected');
          
          // High latency warning popup DISABLED - only header ms indicator shown
          // const now = Date.now();
          // if (latency > HIGH_PING_WARNING_THRESHOLD && 
          //     stats.median > HIGH_PING_WARNING_THRESHOLD &&
          //     now - lastHighPingWarningRef.current > HIGH_PING_WARNING_COOLDOWN) {
          //   lastHighPingWarningRef.current = now;
          //   sonnerToast.warning(`High latency: ${latency}ms`, {
          //     id: TOAST_ID_HIGH_LATENCY,
          //     description: `Average: ${stats.average}ms. Consider switching to WiFi.`,
          //     duration: 2000,
          //   });
          // }
        }
      })
      // Action confirmation for optimistic updates
      .on('broadcast', { event: 'action_confirm' }, (payload) => {
        const { actionId, senderId } = payload.payload;
        if (senderId !== user?.id && actionId) {
          ludoSyncEngine.confirmAction(actionId);
          console.log('[LudoKingSync] Action confirmed:', actionId);
        }
      })
      .subscribe((status) => {
        console.log('[LudoKingSync] Channel status:', status);
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
      // Reset ping when not in active phase
      setPingLatency(null);
      return;
    }

    // Ultra-fast ping with high-precision timing
    const sendPing = () => {
      if (!gameActionChannelRef.current) return;
      
      // Use ultra-short ID for minimal payload
      const pingId = ultraShortId();
      const timestamp = HighPrecisionTimer.timestamp();
      
      // Store with high-precision time for accurate measurement
      pendingPingsRef.current.set(pingId, HighPrecisionTimer.now());
      
      // Send ping with minimal payload (esports-optimized)
      gameActionChannelRef.current.send({
        type: 'broadcast',
        event: 'ping',
        payload: { s: user.id, p: pingId, t: timestamp } // Shortened keys for smaller payload
      }).catch(() => {
        pendingPingsRef.current.delete(pingId);
        networkAnalyzer.recordLoss(); // Track packet loss
      });
      
      // Clean up old pending pings aggressively (shorter timeout)
      const now = HighPrecisionTimer.now();
      let missedPings = 0;
      pendingPingsRef.current.forEach((time, id) => {
        if (now - time > PING_TIMEOUT_MS) {
          pendingPingsRef.current.delete(id);
          missedPings++;
          networkAnalyzer.recordLoss();
        }
      });
      
      // Track missed pings for connection quality
      if (missedPings > 1) {
        setConnectionQuality('poor');
      }
      
      // Don't show misleading values when opponent is offline
      if (missedPings > 0 && !opponentOnline) {
        setPingLatency(null);
      }
    };

    // Connection warmup for optimal first-ping performance
    const performWarmup = async () => {
      console.log('[UltraLatency] Starting connection warmup...');
      let warmupPings = 0;
      const warmupInterval = setInterval(() => {
        if (warmupPings < ULTRA_CONFIG.CONNECTION_WARMUP_PINGS) {
          sendPing();
          warmupPings++;
        } else {
          clearInterval(warmupInterval);
          console.log('[UltraLatency] Warmup complete, starting regular pings');
          setupPingInterval();
        }
      }, ULTRA_CONFIG.WARMUP_INTERVAL);
    };

    // Esports-grade adaptive ping interval (80ms ultra-low target)
    const setupPingInterval = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // Adaptive interval based on network quality
      const analysis = networkAnalyzer.analyze();
      let interval: number;
      
      if (analysis.grade === 'S' || analysis.grade === 'A') {
        interval = ULTRA_CONFIG.PING_INTERVAL_ULTRA; // 80ms for excellent
      } else if (analysis.grade === 'B') {
        interval = PING_INTERVAL_MS; // 100ms for good
      } else {
        interval = Math.min(150, globalQoSManager.getPingInterval()); // 150ms max for poor
      }
      
      pingIntervalRef.current = setInterval(sendPing, interval);
    };
    
    // Start with warmup, then regular pings
    performWarmup();
    
    // Re-adjust interval every 2 seconds for ultra-responsive adaptation
    const adaptiveInterval = setInterval(setupPingInterval, 2000);

    return () => {
      clearInterval(adaptiveInterval);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [gameState.phase, user, opponentOnline]);

  // Ultra-low latency broadcast with fast-path routing
  const broadcastAction = useCallback(async (event: string, payload: any) => {
    if (!gameActionChannelRef.current || !user) return;
    
    const timestamp = HighPrecisionTimer.timestamp();
    lastActionRef.current = timestamp;
    
    // Generate ultra-short action ID for minimal payload
    const actionId = ultraShortId();
    
    // Check if this is a priority event (fast-path)
    const isPriority = ULTRA_CONFIG.PRIORITY_EVENTS.has(event);
    
    const message = {
      type: 'broadcast' as const,
      event,
      payload: { 
        ...payload, 
        s: user.id, // Shortened key
        t: timestamp, 
        a: actionId 
      }
    };
    
    // Track channel activity
    globalChannelManager.markActivity(`ludo-actions-${gameState.roomId}`, 'send');
    
    // Priority events: send immediately without waiting
    if (isPriority) {
      gameActionChannelRef.current.send(message).catch(() => {
        networkAnalyzer.recordLoss();
      });
      return actionId;
    }
    
    // Non-priority: ultra-fast retry with minimal backoff
    for (let attempt = 0; attempt <= BROADCAST_RETRY_COUNT; attempt++) {
      try {
        await gameActionChannelRef.current.send(message);
        return actionId;
      } catch (err) {
        globalChannelManager.markError(`ludo-actions-${gameState.roomId}`);
        networkAnalyzer.recordLoss();
        
        if (attempt < BROADCAST_RETRY_COUNT) {
          // Ultra-fast backoff: 10ms, 15ms, 22ms, 33ms, 50ms
          await new Promise(resolve => setTimeout(resolve, BROADCAST_RETRY_DELAY * Math.pow(1.5, attempt)));
        } else {
          console.error('[UltraLatency] Broadcast failed after retries');
          setConnectionStatus('disconnected');
        }
      }
    }
    return null;
  }, [user, gameState.roomId]);

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

  // Claim win when opponent explicitly forfeits (exits the match)
  const claimWinByForfeit = useCallback(async () => {
    if (!user || !gameState.roomId || gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players.find(p => p.id === user.id);
    if (!currentPlayer) return;

    console.log('[LudoSync] Claiming win by opponent forfeit (explicit exit)');
    
    // Update room status
    await supabase
      .from('ludo_rooms')
      .update({
        status: 'completed',
        winner_id: user.id,
        ended_at: new Date().toISOString()
      })
      .eq('id', gameState.roomId);

    // Credit reward to wallet (only for paid matches)
    if (gameState.rewardAmount > 0) {
      await supabase.from('profiles').update({
        wallet_balance: walletBalance + gameState.rewardAmount
      }).eq('id', user.id);

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'prize',
        amount: gameState.rewardAmount,
        status: 'completed',
        description: `Won Ludo match by opponent forfeit (Room: ${gameState.roomCode})`
      });

      setWalletBalance(prev => prev + gameState.rewardAmount);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🏆 Victory!',
        message: `Opponent quit the match. You won ₹${gameState.rewardAmount}!`,
        type: 'success'
      });
    } else {
      // Free match - just send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🏆 Victory!',
        message: 'Opponent quit the match. You win!',
        type: 'success'
      });
    }

    // Update game state to show win
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      winner: currentPlayer,
      canRoll: false
    }));

    // Clear any countdown
    setOpponentDisconnectCountdown(null);
    
    toast({
      title: '🏆 You Win!',
      description: 'Opponent left the match.',
    });
  }, [user, gameState.roomId, gameState.phase, gameState.players, gameState.roomCode, gameState.rewardAmount, walletBalance, toast]);

  // Exit match and forfeit to opponent (explicit quit - immediate loss)
  const exitAndForfeit = useCallback(async () => {
    if (!user || !gameState.roomId || gameState.phase !== 'playing') return;

    console.log('[LudoSync] Player exiting - forfeiting match to opponent');
    
    // Broadcast forfeit to opponent FIRST (so they get immediate win)
    if (gameActionChannelRef.current) {
      await gameActionChannelRef.current.send({
        type: 'broadcast',
        event: 'player_forfeit',
        payload: { 
          senderId: user.id, 
          s: user.id,
          timestamp: Date.now(),
          t: Date.now()
        }
      });
    }

    // Find opponent to award them the win
    const opponent = gameState.players.find(p => p.id !== user.id);
    
    if (opponent) {
      // Update room status - opponent wins
      await supabase
        .from('ludo_rooms')
        .update({
          status: 'completed',
          winner_id: opponent.id,
          ended_at: new Date().toISOString()
        })
        .eq('id', gameState.roomId);

      // Award opponent (only for paid matches)
      if (gameState.rewardAmount > 0) {
        // Credit reward to opponent's wallet
        const { data: opponentProfile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', opponent.id)
          .single();
        
        if (opponentProfile) {
          await supabase.from('profiles').update({
            wallet_balance: Number(opponentProfile.wallet_balance) + gameState.rewardAmount
          }).eq('id', opponent.id);

          // Create transaction for opponent
          await supabase.from('transactions').insert({
            user_id: opponent.id,
            type: 'prize',
            amount: gameState.rewardAmount,
            status: 'completed',
            description: `Won Ludo match by opponent forfeit (Room: ${gameState.roomCode})`
          });
        }

        // Notify opponent
        await supabase.from('notifications').insert({
          user_id: opponent.id,
          title: '🏆 Victory!',
          message: `Opponent quit the match. You won ₹${gameState.rewardAmount}!`,
          type: 'success'
        });
      }
    }

    // Show loss toast to current user
    toast({
      title: 'Match Forfeited',
      description: 'You left the match. Opponent wins.',
      variant: 'destructive'
    });
  }, [user, gameState.roomId, gameState.phase, gameState.players, gameState.roomCode, gameState.rewardAmount, toast]);

  // Extend countdown - give opponent more time
  const extendDisconnectCountdown = useCallback(() => {
    if (opponentDisconnectCountdown === null) return;
    setOpponentDisconnectCountdown(prev => (prev || 0) + 60);
    sonnerToast.success('Extended wait time by 60 seconds');
  }, [opponentDisconnectCountdown]);

  // Skip countdown and claim win immediately
  const skipCountdownAndClaimWin = useCallback(() => {
    if (opponentDisconnectCountdown === null || gameState.phase !== 'playing') return;
    // Clear the countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    // Trigger claim win
    claimWinByDisconnect();
  }, [opponentDisconnectCountdown, gameState.phase, claimWinByDisconnect]);
  // 60-second countdown when opponent disconnects
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
      console.log('[LudoSync] Opponent offline - starting 60s countdown');
      soundManager.playDisconnectAlert();
      
      // Only start countdown if not already running
      if (opponentDisconnectCountdown === null) {
        setOpponentDisconnectCountdown(60);
        
        // Show notification
        sonnerToast.warning('Opponent disconnected!', {
          description: 'Waiting 60 seconds for them to reconnect...',
          duration: 4000
        });
        
        // Start countdown interval
        countdownIntervalRef.current = setInterval(() => {
          setOpponentDisconnectCountdown(prev => {
            if (prev === null || prev <= 1) {
              // Time's up - claim win
              clearInterval(countdownIntervalRef.current!);
              countdownIntervalRef.current = null;
              console.log('[LudoSync] Countdown finished - claiming win');
              claimWinByDisconnect();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      // Opponent came back online - clear countdown
      if (opponentDisconnectCountdown !== null) {
        console.log('[LudoSync] Opponent reconnected - clearing countdown');
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setOpponentDisconnectCountdown(null);
        
        sonnerToast.success('Opponent reconnected!', {
          description: 'Game continues...',
          duration: 2000
        });
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [opponentOnline, gameState.phase, claimWinByDisconnect, opponentDisconnectCountdown]);

  // NOTE: 60-second countdown timer for disconnect - only Exit Match gives instant win


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
        
        // Only allow roll if it's my turn AND I haven't rolled yet
        const canRollNow = isMyTurn && !prev.hasRolled;
        
        return {
          ...prev,
          phase: 'playing',
          players: gameData.players,
          currentTurn: gameData.currentTurn,
          diceValue: gameData.diceValue,
          canRoll: canRollNow,
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

    // Fetch player names and avatars
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code, avatar_url')
      .eq('id', roomData.host_id)
      .single();

    const { data: guestProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code, avatar_url')
      .eq('id', roomData.guest_id!)
      .single();

    const hostUid = hostProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();
    const guestUid = guestProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();
    // Never fall back to email/phone as display name
    const hostName = hostProfile?.username || `Player ${hostUid}`;
    const guestName = guestProfile?.username || `Player ${guestUid}`;

    const players: Player[] = [
      {
        id: roomData.host_id,
        name: hostName,
        uid: hostUid,
        isBot: false,
        color: hostColor,
        tokens: createInitialTokens(hostColor),
        tokensHome: 0,
        avatar: hostProfile?.avatar_url || undefined
      },
      {
        id: roomData.guest_id!,
        name: guestName,
        uid: guestUid,
        isBot: false,
        color: guestColor,
        tokens: createInitialTokens(guestColor),
        tokensHome: 0,
        avatar: guestProfile?.avatar_url || undefined
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

  // Resume an active friend room
  const resumeFriendRoom = useCallback(async () => {
    if (!user || !activeFriendRoomData) {
      toast({ title: 'No active room to resume', variant: 'destructive' });
      return;
    }

    try {
      console.log('[FriendLudo] Resuming room:', activeFriendRoomData.roomId);
      
      // Start the room connection
      startRoom(
        activeFriendRoomData.roomId,
        activeFriendRoomData.roomCode,
        activeFriendRoomData.isHost,
        activeFriendRoomData.entryAmount,
        activeFriendRoomData.rewardAmount
      );
      
      setHasActiveFriendRoom(false);
      setActiveFriendRoomData(null);
      
      toast({ title: '🎮 Room Resumed!', description: 'Reconnected to your match' });
      soundManager.playWin();
    } catch (err) {
      console.error('[FriendLudo] Error resuming room:', err);
      toast({ title: 'Failed to resume room', variant: 'destructive' });
    }
  }, [user, activeFriendRoomData, startRoom, toast]);

  // Auto-resume effect for friend rooms
  useEffect(() => {
    if (shouldAutoResumeFriend && activeFriendRoomData && user) {
      console.log('[FriendLudo] Auto-resuming room...');
      setShouldAutoResumeFriend(false);
      resumeFriendRoom();
    }
  }, [shouldAutoResumeFriend, activeFriendRoomData, user, resumeFriendRoom]);

  // Track when user leaves the friend game (for auto-resume detection)
  useEffect(() => {
    const isActivePhase = gameState.phase === 'playing' || gameState.phase === 'waiting';
    if (isActivePhase && gameState.roomId) {
      // Update active timestamp periodically
      const updateActiveTime = () => {
        localStorage.setItem(`ludo_friend_active_${gameState.roomId}`, Date.now().toString());
      };
      
      // Update immediately and then every 5 seconds
      updateActiveTime();
      const interval = setInterval(updateActiveTime, 5000);
      
      // Also update on visibility change (when user switches tabs)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          updateActiveTime();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup on unmount or phase change
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // Final update when leaving
        updateActiveTime();
      };
    }
  }, [gameState.phase, gameState.roomId]);

  // Dismiss active friend room (forfeit)
  const dismissActiveFriendRoom = useCallback(async () => {
    if (!user || !activeFriendRoomData) return;

    try {
      // Mark room as cancelled
      await supabase
        .from('ludo_rooms')
        .update({ 
          status: 'cancelled',
          ended_at: new Date().toISOString()
        })
        .eq('id', activeFriendRoomData.roomId);

      toast({ 
        title: 'Room Forfeited', 
        description: 'Match has been cancelled',
        variant: 'destructive'
      });

      setHasActiveFriendRoom(false);
      setActiveFriendRoomData(null);
    } catch (err) {
      console.error('[FriendLudo] Error dismissing room:', err);
    }
  }, [user, activeFriendRoomData, toast]);

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

  // Move token function - FIXED: Uses BOARD COORDINATES for accurate capture detection
  const moveToken = useCallback((color: string, tokenId: number, diceValue: number, players: Player[]): { updatedPlayers: Player[]; winner: Player | null; gotSix: boolean; capturedOpponent: boolean } => {
    soundManager.playTokenMove();

    let winner: Player | null = null;
    let capturedOpponent = false;
    let newTokenPosition = 0;
    let newBoardCoords: { x: number; y: number } | null = null;

    const movingPlayer = players.find(p => p.color === color);
    const movingToken = movingPlayer?.tokens.find(t => t.id === tokenId);

    if (movingToken) {
      if (movingToken.position === 0 && diceValue === 6) {
        newTokenPosition = 1;
      } else if (movingToken.position > 0) {
        newTokenPosition = Math.min(movingToken.position + diceValue, 57);
      }
      // Get ABSOLUTE board coordinates for capture checking
      newBoardCoords = getBoardCoords(newTokenPosition, color);
      
      console.log('[FriendLudo] Token Move:', {
        color,
        tokenId,
        diceValue,
        oldPosition: movingToken.position,
        newTokenPosition,
        newBoardCoords
      });
    }

    const updatedPlayers = players.map(player => {
      if (player.color === color) {
        const updatedTokens = player.tokens.map(token => {
          if (token.id !== tokenId) return token;

          let newPosition = token.position;
          if (token.position === 0 && diceValue === 6) {
            newPosition = 1;
            soundManager.playTokenEnter();
          } else if (token.position > 0) {
            newPosition = Math.min(token.position + diceValue, 57);
            if (newPosition === 57) {
              soundManager.playTokenHome();
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
        // FIXED: Check capture using BOARD COORDINATES, not position numbers
        // Position numbers are relative to each player's track - they can't be compared directly!
        if (!newBoardCoords || newTokenPosition >= 52 || newTokenPosition === 0) {
          return player;
        }
        
        // Check if new position is a safe spot
        if (isSafeBoardPosition(newBoardCoords)) {
          return player;
        }

        // Check each opponent token by comparing BOARD coordinates
        const updatedTokens = player.tokens.map(token => {
          if (token.position <= 0 || token.position >= 52) return token;
          
          // Get opponent token's ABSOLUTE board coordinates
          const opponentCoords = getBoardCoords(token.position, player.color);
          if (!opponentCoords) return token;
          
          // Compare BOARD coordinates - if they match, it's a capture!
          if (opponentCoords.x === newBoardCoords!.x && opponentCoords.y === newBoardCoords!.y) {
            capturedOpponent = true;
            console.log('[FriendLudo] CAPTURE! Opponent token reset to base:', {
              capturedColor: player.color,
              capturedTokenId: token.id,
              capturedPosition: token.position,
              capturedCoords: opponentCoords,
              capturerColor: color,
              capturerPosition: newTokenPosition,
              capturerCoords: newBoardCoords
            });
            return { ...token, position: 0 };
          }
          return token;
        });
        return { ...player, tokens: updatedTokens };
      }
    });

    if (capturedOpponent) {
      setTimeout(() => {
        soundManager.playCapture();
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
    // Use lastUserId during token refresh for continuity
    const effectiveUserId = user?.id || (isRefreshing ? lastUserId : null);
    
    if (!gameState.canRoll || gameState.isRolling || !effectiveUserId) {
      console.log('[LudoGame] Roll blocked:', { 
        canRoll: gameState.canRoll, 
        isRolling: gameState.isRolling, 
        hasUser: !!effectiveUserId,
        isRefreshing 
      });
      return;
    }

    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer) {
      console.error('[LudoGame] No current player found at turn:', gameState.currentTurn);
      return;
    }
    
    // CRITICAL: Validate user ID matches current player (use effective ID during refresh)
    if (currentPlayer.id !== effectiveUserId) {
      console.error('[LudoGame] User ID mismatch!', { 
        currentPlayerId: currentPlayer.id, 
        userId: effectiveUserId,
        isRefreshing 
      });
      toast({ title: 'Not your turn!', variant: 'destructive' });
      return;
    }

    console.log('[LudoKingSync] Rolling dice for user:', effectiveUserId);

    // === LUDO KING PREDICTIVE ANIMATION ===
    // 1. Start local animation IMMEDIATELY (no waiting)
    const predictedValue = ludoPredictiveAnimator.startDiceRoll();
    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false, hasRolled: true }));
    
    // 2. Broadcast rolling start so opponent syncs animation
    broadcastAction('dice_rolling', { predictedValue });
    
    // 3. Generate actual dice value
    const diceValue = generateDiceValue();
    
    // 4. Wait for animation (reduced from 800ms for snappier feel)
    await new Promise(resolve => setTimeout(resolve, ANIMATION_TIMING.DICE_ROLL_MIN_DURATION));

    // 5. Confirm predictive animation with actual value
    ludoPredictiveAnimator.confirmDiceRoll(diceValue);
    
    // 6. Broadcast result - opponent already animated, just needs value
    broadcastAction('dice_roll', { diceValue });

    setGameState(prev => {
      const player = prev.players[prev.currentTurn];
      
      // Double-check user still matches
      if (player?.id !== user.id) {
        console.error('[LudoKingSync] Player ID changed during roll!');
        return { ...prev, isRolling: false };
      }

      // Check if can move any token
      const canMove = player.tokens.some(token => {
        if (token.position === 0 && diceValue === 6) return true;
        if (token.position > 0 && token.position + diceValue <= 57) return true;
        return false;
      });

      if (!canMove) {
        const nextTurn = (prev.currentTurn + 1) % prev.players.length;
        syncGameState(prev.players, nextTurn, diceValue);
        // Reset hasRolled for next player's turn
        return { ...prev, diceValue, isRolling: false, hasRolled: false, currentTurn: nextTurn, canRoll: false };
      }

      // Player can move - hasRolled stays true until they move a token
      return { ...prev, diceValue, isRolling: false, hasRolled: true };
    });
  }, [gameState.canRoll, gameState.isRolling, gameState.players, gameState.currentTurn, user, isRefreshing, lastUserId, generateDiceValue, broadcastAction, toast]);

  // Handle token click
  const handleTokenClick = useCallback((color: string, tokenId: number) => {
    // Use lastUserId during token refresh for continuity
    const effectiveUserId = user?.id || (isRefreshing ? lastUserId : null);
    
    if (!effectiveUserId) {
      console.error('[LudoGame] No user for token click');
      return;
    }

    // Get current state for validation
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer) {
      console.error('[LudoGame] No current player for token click');
      return;
    }
    
    // Validate: color matches, it's user's turn, and user ID matches
    if (currentPlayer.color !== color) {
      console.log('[LudoGame] Token click blocked: wrong color');
      return;
    }
    if (currentPlayer.id !== effectiveUserId) {
      console.error('[LudoGame] Token click blocked: user ID mismatch', { 
        currentPlayerId: currentPlayer.id, 
        userId: effectiveUserId,
        isRefreshing 
      });
      return;
    }
    if (gameState.canRoll) {
      console.log('[LudoGame] Token click blocked: must roll first');
      return;
    }

    const token = currentPlayer.tokens.find(t => t.id === tokenId);
    if (!token) return;

    const canMove =
      (token.position === 0 && gameState.diceValue === 6) ||
      (token.position > 0 && token.position + gameState.diceValue <= 57);

    if (!canMove) return;

    // === LUDO KING PREDICTIVE TOKEN MOVE ===
    // Calculate new position for predictive animation
    const fromPosition = token.position;
    const toPosition = token.position === 0 ? 1 : Math.min(token.position + gameState.diceValue, 57);
    
    // Start predictive animation
    ludoPredictiveAnimator.startTokenMove(color, tokenId, fromPosition, toPosition);
    
    const { updatedPlayers, winner, gotSix } = moveToken(color, tokenId, gameState.diceValue, gameState.players);
    const nextTurn = gotSix ? gameState.currentTurn : (gameState.currentTurn + 1) % gameState.players.length;

    // Broadcast token move with action tracking
    broadcastAction('token_move', {
      color,
      tokenId,
      fromPosition,
      toPosition,
      newPlayers: updatedPlayers,
      nextTurn,
      gotSix,
      winnerId: winner?.id || null
    });

    // Confirm predictive animation
    ludoPredictiveAnimator.confirmTokenMove(color, tokenId, toPosition);

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
        hasRolled: false, // Reset so player can roll again
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
      hasRolled: false, // Reset for opponent's turn
      selectedToken: null
    }));
  }, [user, isRefreshing, lastUserId, gameState.players, gameState.currentTurn, gameState.canRoll, gameState.diceValue, moveToken, broadcastAction]);

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
    // Clean up sync engine and predictive animator
    ludoSyncEngine.destroy();
    ludoPredictiveAnimator.destroy();
    
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
      hasRolled: false,
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
    setOpponentDisconnectCount(0); // Reset disconnect count on game reset
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
      .maybeSingle();

    if (roomData && roomData.game_state) {
      const gameData = roomData.game_state as unknown as GameStateData;
      const isMyTurn = user ? gameData.players[gameData.currentTurn]?.id === user.id : false;
      const checksum = generateChecksum(gameData.players, gameData.currentTurn, gameData.diceValue);

      // Reset mismatch tracking after successful resync
      consecutiveMismatchesRef.current = 0;
      lastReceivedChecksumRef.current = checksum;

      setGameState(prev => {
        // Check if we should allow roll - only if it's our turn AND we haven't rolled yet
        const canRollNow = isMyTurn && !prev.isRolling && !prev.hasRolled;
        return {
          ...prev,
          players: gameData.players,
          currentTurn: gameData.currentTurn,
          diceValue: gameData.diceValue,
          canRoll: canRollNow,
          isRolling: false,
          stateChecksum: checksum,
          lastSyncTime: Date.now()
        };
      });

      setSyncStatus('synced');
      
      if (isAuto) {
        console.log('[LudoSync] Auto-resynced from database');
        const now = Date.now();
        if (now - lastAutoResyncToastRef.current > AUTO_RESYNC_TOAST_COOLDOWN_MS) {
          lastAutoResyncToastRef.current = now;
          sonnerToast.info('Game state synchronized', {
            id: TOAST_ID_SYNC_RECOVERED,
            description: 'Recovered from state mismatch',
            duration: 2000,
          });
        }
      } else {
        toast({ title: '✅ Synced!', description: 'Game state updated' });
      }
    } else if (!roomData) {
      console.error('[LudoSync] Room not found during resync');
      setSyncStatus('synced');
    }
  }, [gameState.roomId, user, toast]);

  // Subscribe to sync channel for enhanced checksum comparison
  const subscribeToSyncChannel = useCallback((roomId: string) => {
    if (syncChannelRef.current) {
      supabase.removeChannel(syncChannelRef.current);
    }

    const channel = supabase
      .channel(`ludo-sync-${roomId}`)
      .on('broadcast', { event: 'checksum' }, (payload) => {
        if (payload.payload.senderId !== user?.id) {
          const theirChecksum = payload.payload.checksum;
          const theirTurn = payload.payload.turn;
          const theirTimestamp = payload.payload.timestamp;
          
          // Store received checksum for comparison
          lastReceivedChecksumRef.current = theirChecksum;
          
          // Calculate our current checksum
          const myChecksum = generateChecksum(gameState.players, gameState.currentTurn, gameState.diceValue);
          
          // Add to history for pattern detection
          checksumHistoryRef.current.push({ checksum: theirChecksum, timestamp: theirTimestamp });
          if (checksumHistoryRef.current.length > 10) {
            checksumHistoryRef.current.shift();
          }
          
          // Avoid false desync during in-flight actions (optimistic / network delay)
          const now = Date.now();
          if (now - lastActionRef.current < CHECKSUM_IN_FLIGHT_GRACE_MS) {
            return;
          }

          if (myChecksum !== theirChecksum) {
            consecutiveMismatchesRef.current += 1;
            console.warn('[LudoSync] Checksum mismatch!', { 
              mine: myChecksum, 
              theirs: theirChecksum,
              myTurn: gameState.currentTurn,
              theirTurn,
              consecutiveMismatches: consecutiveMismatchesRef.current
            });
            
            setLastMismatchTime(Date.now());
            setSyncStatus('mismatch');
            
            // Only auto-resync if we hit threshold AND cooldown has passed
            const cooldownPassed = now - lastResyncTimeRef.current > CHECKSUM_RESYNC_COOLDOWN_MS;
            
            if (consecutiveMismatchesRef.current >= CHECKSUM_MISMATCH_THRESHOLD && cooldownPassed) {
              console.log('[LudoSync] Threshold reached, triggering auto-resync');
              lastResyncTimeRef.current = now;
              consecutiveMismatchesRef.current = 0;
              
              setTimeout(() => {
                resyncGameState(true);
              }, 300);
            }
          } else {
            // Checksums match - reset counter
            if (consecutiveMismatchesRef.current > 0) {
              console.log('[LudoSync] Checksums now match, resetting mismatch counter');
            }
            consecutiveMismatchesRef.current = 0;
            setSyncStatus('synced');
          }
        }
      })
      .on('broadcast', { event: 'state_request' }, async (payload) => {
        // Respond to state sync requests from opponent
        if (payload.payload.requesterId !== user?.id && gameState.phase === 'playing') {
          console.log('[LudoSync] Received state request, broadcasting full sync');
          broadcastAction('full_sync', {
            players: gameState.players,
            currentTurn: gameState.currentTurn,
            diceValue: gameState.diceValue,
            phase: gameState.phase,
            hasRolled: gameState.hasRolled // Include roll state to prevent re-roll exploit
          });
        }
      })
      .subscribe();

    syncChannelRef.current = channel;
  }, [user, gameState.players, gameState.currentTurn, gameState.diceValue, gameState.phase, resyncGameState, broadcastAction]);

  // Enhanced checksum broadcast with more state data
  const broadcastChecksum = useCallback(() => {
    if (!syncChannelRef.current || !user || gameState.phase !== 'playing') return;
    
    const checksum = generateChecksum(gameState.players, gameState.currentTurn, gameState.diceValue);
    
    // Update local checksum state
    setGameState(prev => {
      if (prev.stateChecksum !== checksum) {
        return { ...prev, stateChecksum: checksum, lastSyncTime: Date.now() };
      }
      return prev;
    });
    
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'checksum',
      payload: { 
        senderId: user.id, 
        checksum,
        turn: gameState.currentTurn,
        dice: gameState.diceValue,
        timestamp: Date.now()
      }
    });
  }, [user, gameState.players, gameState.currentTurn, gameState.diceValue, gameState.phase]);

  // Request state sync from opponent (for recovery)
  const requestStateSync = useCallback(() => {
    if (!syncChannelRef.current || !user) return;
    
    console.log('[LudoSync] Requesting state sync from opponent');
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'state_request',
      payload: { requesterId: user.id, timestamp: Date.now() }
    });
  }, [user]);

  // Start/stop checksum verification interval - now more frequent
  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.roomId) {
      // Subscribe to sync channel
      subscribeToSyncChannel(gameState.roomId);
      
      // Reset mismatch tracking on game start
      consecutiveMismatchesRef.current = 0;
      lastResyncTimeRef.current = 0;
      checksumHistoryRef.current = [];
      
      // Broadcast checksum at esports-grade frequency (150ms from SYNC_CONFIG)
      checksumIntervalRef.current = setInterval(() => {
        broadcastChecksum();
      }, CHECKSUM_INTERVAL_MS);

      // Initial checksum broadcast (faster start)
      setTimeout(() => broadcastChecksum(), 200);

      return () => {
        if (checksumIntervalRef.current) {
          clearInterval(checksumIntervalRef.current);
          checksumIntervalRef.current = null;
        }
      };
    }
  }, [gameState.phase, gameState.roomId, subscribeToSyncChannel, broadcastChecksum]);

  // Subscribe to rematch channel - with proper subscription confirmation
  const subscribeToRematchChannel = useCallback((roomId: string) => {
    if (rematchChannelRef.current) {
      supabase.removeChannel(rematchChannelRef.current);
      rematchChannelRef.current = null;
    }

    console.log('[Rematch] Subscribing to rematch channel:', roomId);

    const channel = supabase
      .channel(`ludo-rematch-${roomId}`)
      .on('broadcast', { event: 'rematch_request' }, (payload) => {
        console.log('[Rematch] Received rematch_request:', payload.payload);
        if (payload.payload.requesterId !== user?.id) {
          setGameState(prev => ({
            ...prev,
            rematchStatus: 'pending',
            rematchRequester: payload.payload.requesterId
          }));
        }
      })
      .on('broadcast', { event: 'rematch_response' }, async (payload) => {
        console.log('[Rematch] Received rematch_response:', payload.payload);
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
      .subscribe((status) => {
        console.log('[Rematch] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Rematch] Channel ready for rematch requests');
        }
      });

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

    // Fetch player names and avatars
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code, avatar_url')
      .eq('id', roomData.host_id)
      .single();

    const { data: guestProfile } = await supabase
      .from('profiles')
      .select('username, email, user_code, avatar_url')
      .eq('id', roomData.guest_id)
      .single();

    const hostUid = hostProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();
    const guestUid = guestProfile?.user_code || Math.floor(10000 + Math.random() * 90000).toString();
    // Never fall back to email/phone as display name
    const hostName = hostProfile?.username || `Player ${hostUid}`;
    const guestName = guestProfile?.username || `Player ${guestUid}`;

    const players: Player[] = [
      {
        id: roomData.host_id,
        name: hostName,
        uid: hostUid,
        isBot: false,
        color: hostColor,
        tokens: createInitialTokens(hostColor),
        tokensHome: 0,
        avatar: hostProfile?.avatar_url || undefined
      },
      {
        id: roomData.guest_id,
        name: guestName,
        uid: guestUid,
        isBot: false,
        color: guestColor,
        tokens: createInitialTokens(guestColor),
        tokensHome: 0,
        avatar: guestProfile?.avatar_url || undefined
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

  // Request rematch - with channel subscription check
  const requestRematch = useCallback(async () => {
    if (!gameState.roomId || !user) {
      console.log('[Rematch] Cannot request: missing roomId or user');
      return;
    }

    // Ensure channel is subscribed - if not, subscribe now
    if (!rematchChannelRef.current) {
      console.log('[Rematch] Channel not ready, subscribing first...');
      subscribeToRematchChannel(gameState.roomId);
      // Wait a bit for subscription
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!rematchChannelRef.current) {
      console.log('[Rematch] Still no channel after subscribe attempt');
      toast({ title: 'Error', description: 'Connection issue, please try again', variant: 'destructive' });
      return;
    }

    console.log('[Rematch] Sending rematch request...');
    
    setGameState(prev => ({
      ...prev,
      rematchStatus: 'pending',
      rematchRequester: user.id
    }));

    try {
      await rematchChannelRef.current.send({
        type: 'broadcast',
        event: 'rematch_request',
        payload: { requesterId: user.id }
      });
      console.log('[Rematch] Request sent successfully');
    } catch (err) {
      console.error('[Rematch] Failed to send request:', err);
      toast({ title: 'Error', description: 'Failed to send rematch request', variant: 'destructive' });
      setGameState(prev => ({ ...prev, rematchStatus: 'idle', rematchRequester: null }));
      return;
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      setGameState(prev => {
        if (prev.rematchStatus === 'pending' && prev.rematchRequester === user.id) {
          return { ...prev, rematchStatus: 'timeout' };
        }
        return prev;
      });
    }, 30000);
  }, [gameState.roomId, user, subscribeToRematchChannel]);

  // Respond to rematch
  const respondToRematch = useCallback(async (accepted: boolean) => {
    console.log('[Rematch] Responding to rematch:', accepted);
    
    if (!rematchChannelRef.current) {
      console.log('[Rematch] No channel for response');
      return;
    }

    try {
      await rematchChannelRef.current.send({
        type: 'broadcast',
        event: 'rematch_response',
        payload: { accepted }
      });
      console.log('[Rematch] Response sent successfully');
    } catch (err) {
      console.error('[Rematch] Failed to send response:', err);
    }

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
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
      }
    };
  }, []);

  // Turn timer effect (15 seconds per turn) - NOW WITH AUTO TURN SWITCH
  useEffect(() => {
    // Only run timer during playing phase
    if (gameState.phase !== 'playing') {
      setTurnTimeLeft(15);
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
      return;
    }

    // Reset timer when turn changes
    setTurnTimeLeft(15);

    // Start countdown
    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - switch turn to opponent
          const currentPlayer = gameState.players[gameState.currentTurn];
          const isMyTurn = currentPlayer?.id === user?.id;
          
          if (isMyTurn && !gameState.isRolling) {
            console.log('[LudoTimer] Time expired - switching turn to opponent');
            
            // Calculate next turn
            const nextTurn = (gameState.currentTurn + 1) % gameState.players.length;
            
            // Broadcast turn skip to opponent
            broadcastAction('turn_timeout', { 
              fromTurn: gameState.currentTurn, 
              toTurn: nextTurn,
              reason: 'timeout'
            });
            
            // Sync to database
            syncGameState(gameState.players, nextTurn, gameState.diceValue);
            
            // Update local state
            setGameState(prev => ({
              ...prev,
              currentTurn: nextTurn,
              canRoll: false,
              hasRolled: false,
              selectedToken: null
            }));
            
            // Play turn change sound
            soundManager.playTurnChange();
            
            sonnerToast.warning('Time expired!', {
              description: 'Turn passed to opponent',
              duration: 2000
            });
          }
          
          return 15; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [gameState.phase, gameState.currentTurn, gameState.players, gameState.isRolling, gameState.diceValue, user?.id, broadcastAction]);

  return {
    gameState,
    walletBalance,
    opponentOnline,
    opponentDisconnectCountdown,
    opponentDisconnectCount,
    syncStatus,
    connectionStatus,
    connectionQuality,
    reconnectAttempts,
    pingLatency,
    turnTimeLeft,
    startRoom,
    rollDice,
    handleTokenClick,
    resetGame,
    exitAndForfeit,
    sendChatMessage,
    triggerCaptureAnimation,
    clearCaptureAnimation,
    resyncGameState,
    requestStateSync,
    requestRematch,
    respondToRematch,
    manualReconnect,
    extendDisconnectCountdown,
    skipCountdownAndClaimWin,
    // Active room resume functionality
    hasActiveFriendRoom,
    activeFriendRoomData,
    isCheckingActiveRoom,
    resumeFriendRoom,
    dismissActiveFriendRoom
  };
};
