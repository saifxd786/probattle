import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BOT_NAMES } from '@/components/ludo/MatchmakingScreen';
import { CUSTOM_AVATARS } from '@/components/ludo/LudoAvatarPicker';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

interface Token {
  id: number;
  position: number;
  color: string;
}

interface Player {
  id: string;
  name: string;
  uid: string; // 5-digit UID
  avatar?: string;
  isBot: boolean;
  status: 'searching' | 'connecting' | 'ready';
  color: string;
  tokens: Token[];
  tokensHome: number;
}

interface GameState {
  phase: 'idle' | 'matchmaking' | 'playing' | 'result';
  matchId: string | null;
  players: Player[];
  currentTurn: number;
  diceValue: number;
  isRolling: boolean;
  canRoll: boolean;
  hasRolled: boolean; // Track if dice was rolled this turn (prevents re-roll exploit on resume)
  selectedToken: { color: string; tokenId: number } | null;
  winner: Player | null;
}

interface LudoSettings {
  isEnabled: boolean;
  minEntryAmount: number;
  rewardMultiplier: number;
  difficulty: 'easy' | 'normal' | 'competitive';
  highAmountCompetitive: boolean;
}

const COLORS = ['red', 'green', 'yellow', 'blue'];

// Track coordinates - Named by STARTING POSITION, not color
// Each track has 51 positions (1-51 main track)
// CRITICAL: These must match LudoBoard.tsx exactly!

// LEFT_TRACK: Starts from LEFT side (1.5, 6.5) going right - RED uses this
const LEFT_TRACK: { x: number; y: number }[] = [
  // Row 6 going right (5 cells: 1-5)
  { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Turn corner at (6.5, 6.5), then go UP (6 cells: 6-11)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Corner at top (1 cell: 12)
  { x: 7.5, y: 0.5 },
  // Go DOWN on right side of top (6 cells: 13-18)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 19-24)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Corner at right (1 cell: 25)
  { x: 14.5, y: 7.5 },
  // Row 8 going left (6 cells: 26-31)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 32-37)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Corner at bottom (1 cell: 38)
  { x: 7.5, y: 14.5 },
  // Go UP on left side (6 cells: 39-44)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 45-50)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Final corner before home path (1 cell: 51)
  { x: 0.5, y: 7.5 },
];

// TOP_TRACK: Starts from TOP (8.5, 1.5) going down - GREEN uses this
const TOP_TRACK: { x: number; y: number }[] = [
  // Column 8 going down (5 cells: 1-5)
  { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 6-11)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Corner at right (1 cell: 12)
  { x: 14.5, y: 7.5 },
  // Row 8 going left (6 cells: 13-18)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 19-24)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Corner at bottom (1 cell: 25)
  { x: 7.5, y: 14.5 },
  // Go UP on left side (6 cells: 26-31)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 32-37)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Corner at left (1 cell: 38)
  { x: 0.5, y: 7.5 },
  // Row 6 going right (6 cells: 39-44)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Go UP (6 cells: 45-50)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Final corner before home path (1 cell: 51)
  { x: 7.5, y: 0.5 },
];

// RIGHT_TRACK: Starts from RIGHT side (13.5, 8.5) going left - YELLOW uses this
const RIGHT_TRACK: { x: number; y: number }[] = [
  // Row 8 going left (5 cells: 1-5)
  { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 6-11)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Corner at bottom (1 cell: 12)
  { x: 7.5, y: 14.5 },
  // Go UP on left side (6 cells: 13-18)
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 19-24)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Corner at left (1 cell: 25)
  { x: 0.5, y: 7.5 },
  // Row 6 going right (6 cells: 26-31)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Go UP (6 cells: 32-37)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Corner at top (1 cell: 38)
  { x: 7.5, y: 0.5 },
  // Go DOWN on right side (6 cells: 39-44)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 45-50)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Final corner before home path (1 cell: 51)
  { x: 14.5, y: 7.5 },
];

// BOTTOM_TRACK: Starts from BOTTOM (6.5, 13.5) going up - BLUE uses this
const BOTTOM_TRACK: { x: number; y: number }[] = [
  // Column 6 going up (5 cells: 1-5)
  { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  // Row 8 going left (6 cells: 6-11)
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  // Corner at left (1 cell: 12)
  { x: 0.5, y: 7.5 },
  // Row 6 going right (6 cells: 13-18)
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  // Go UP (6 cells: 19-24)
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  // Corner at top (1 cell: 25)
  { x: 7.5, y: 0.5 },
  // Go DOWN on right side (6 cells: 26-31)
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  // Row 6 going right (6 cells: 32-37)
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  // Corner at right (1 cell: 38)
  { x: 14.5, y: 7.5 },
  // Row 8 going left (6 cells: 39-44)
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  // Go DOWN (6 cells: 45-50)
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  // Final corner before home path (1 cell: 51)
  { x: 7.5, y: 14.5 },
];

// Map colors to their correct tracks - MUST match LudoBoard.tsx
const COLOR_TRACK_COORDS: { [color: string]: { x: number; y: number }[] } = {
  red: LEFT_TRACK,    // RED starts from LEFT (1.5, 6.5)
  green: TOP_TRACK,   // GREEN starts from TOP (8.5, 1.5)
  yellow: RIGHT_TRACK, // YELLOW starts from RIGHT (13.5, 8.5)
  blue: BOTTOM_TRACK, // BLUE starts from BOTTOM (6.5, 13.5)
};

// Safe positions (board coordinates) - starting positions and safe spots
const SAFE_POSITIONS = [
  // Starting positions (where tokens enter the track)
  { x: 1.5, y: 6.5 },   // Red start (LEFT)
  { x: 8.5, y: 1.5 },   // Green start (TOP)
  { x: 13.5, y: 8.5 },  // Yellow start (RIGHT)
  { x: 6.5, y: 13.5 },  // Blue start (BOTTOM)
  // Safe spots (star positions in the middle of each side)
  { x: 2.5, y: 6.5 },   // Near red start
  { x: 8.5, y: 2.5 },   // Near green start
  { x: 12.5, y: 8.5 },  // Near yellow start
  { x: 6.5, y: 12.5 },  // Near blue start
];

// Get board coordinates for a token position
const getBoardCoords = (position: number, color: string): { x: number; y: number } | null => {
  if (position <= 0 || position >= 52) return null; // Home or home stretch
  const track = COLOR_TRACK_COORDS[color];
  if (!track || position - 1 >= track.length) return null;
  return track[position - 1];
};

// Check if position is a safe spot
const isSafePosition = (coords: { x: number; y: number }): boolean => {
  return SAFE_POSITIONS.some(safe => safe.x === coords.x && safe.y === coords.y);
};

// Generate random 5-digit UID
const generateUID = (): string => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const useLudoGame = () => {
  const { user, isRefreshing, lastUserId } = useAuth();
  const { toast } = useToast();
  const botTurnRef = useRef<boolean>(false);
  const gameInProgressRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null); // Track user ID for consistency
  
  const [settings, setSettings] = useState<LudoSettings>({
    isEnabled: true,
    minEntryAmount: 10,
    rewardMultiplier: 1.5,
    difficulty: 'normal',
    highAmountCompetitive: true
  });
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    matchId: null,
    players: [],
    currentTurn: 0,
    diceValue: 1,
    isRolling: false,
    canRoll: false,
    hasRolled: false,
    selectedToken: null,
    winner: null
  });
  
  // Track user ID changes - but ignore during token refresh to preserve game state
  useEffect(() => {
    // Skip user ID change detection during token refresh
    if (isRefreshing) {
      console.log('[LudoGame] Token refresh in progress - preserving game state');
      return;
    }
    
    if (user?.id) {
      if (userIdRef.current && userIdRef.current !== user.id) {
        // Check if this is just a token refresh (same user)
        if (lastUserId === user.id) {
          console.log('[LudoGame] Same user after token refresh:', user.id);
          userIdRef.current = user.id;
          return;
        }
        
        console.warn('[LudoGame] User ID changed during session!', {
          old: userIdRef.current,
          new: user.id,
          lastUserId
        });
        // Reset game state if user changes (not during token refresh)
        if (gameState.phase !== 'idle') {
          console.log('[LudoGame] Resetting game due to actual user change');
          setGameState({
            phase: 'idle',
            matchId: null,
            players: [],
            currentTurn: 0,
            diceValue: 1,
            isRolling: false,
            canRoll: false,
            hasRolled: false,
            selectedToken: null,
            winner: null
          });
        }
      }
      userIdRef.current = user.id;
    }
  }, [user?.id, isRefreshing, lastUserId, gameState.phase]);
  
  const [entryAmount, setEntryAmount] = useState(10);
  const [playerMode, setPlayerMode] = useState<2 | 3 | 4>(2);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userUID, setUserUID] = useState<string>('');
  const [userName, setUserName] = useState<string>('You');
  const [captureEvent, setCaptureEvent] = useState<{
    capturedColor: string;
    position: number;
    capturingColor: string;
  } | null>(null);

  // Active game detection for resume
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [activeGameData, setActiveGameData] = useState<{
    matchId: string;
    entryAmount: number;
    rewardAmount: number;
    playerCount: number;
    gameState: any;
  } | null>(null);
  const [isCheckingActiveGame, setIsCheckingActiveGame] = useState(true);

  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Turn timer state (15s per turn)
  const [turnTimeLeft, setTurnTimeLeft] = useState(15);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Offline timer state (60s for disconnection)
  const [offlineTimeLeft, setOfflineTimeLeft] = useState<number | undefined>(undefined);

  // Fetch user profile and UID
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance, user_code, avatar_url, username')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setWalletBalance(Number(data.wallet_balance));
        setUserUID(data.user_code || generateUID());
        setUserAvatar(data.avatar_url || null);
        setUserName(data.username || 'You');
      }
    };
    
    fetchProfile();
  }, [user]);

  // If username arrives later, update it in any already-running game state
  useEffect(() => {
    if (!user) return;
    setGameState(prev => {
      const hasMe = prev.players.some(p => p.id === user.id);
      if (!hasMe) return prev;
      return {
        ...prev,
        players: prev.players.map(p => (p.id === user.id ? { ...p, name: userName || 'You' } : p))
      };
    });
  }, [user, userName]);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('ludo_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setSettings({
          isEnabled: data.is_enabled,
          minEntryAmount: Number(data.min_entry_amount),
          rewardMultiplier: Number(data.reward_multiplier),
          difficulty: data.difficulty as LudoSettings['difficulty'],
          highAmountCompetitive: data.high_amount_competitive ?? true
        });
        setEntryAmount(Math.max(10, Number(data.min_entry_amount)));
      }
    };
    
    fetchSettings();
  }, []);

  // Auto-resume flag to prevent multiple resume attempts
  const [shouldAutoResume, setShouldAutoResume] = useState(false);

  // Check for active in-progress games on mount
  useEffect(() => {
    if (!user) {
      setIsCheckingActiveGame(false);
      return;
    }

    const checkActiveGame = async () => {
      try {
        // Find any in-progress matches where user is a player
        const { data: activeMatch, error } = await supabase
          .from('ludo_matches')
          .select(`
            id,
            entry_amount,
            reward_amount,
            player_count,
            game_state,
            updated_at,
            ludo_match_players!inner (
              user_id,
              is_bot,
              bot_name,
              bot_avatar_url,
              player_color,
              token_positions,
              tokens_home
            )
          `)
          .eq('status', 'in_progress')
          .eq('ludo_match_players.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[LudoGame] Error checking active game:', error);
          setIsCheckingActiveGame(false);
          return;
        }

        if (activeMatch) {
          console.log('[LudoGame] Found active game:', activeMatch.id);
          
          // Check if game was left within 60 seconds (auto-resume window)
          const lastActiveTime = localStorage.getItem(`ludo_game_active_${activeMatch.id}`);
          const now = Date.now();
          const AUTO_RESUME_WINDOW = 60 * 1000; // 60 seconds
          
          let canAutoResume = false;
          if (lastActiveTime) {
            const timeSinceLeave = now - parseInt(lastActiveTime, 10);
            canAutoResume = timeSinceLeave <= AUTO_RESUME_WINDOW;
            console.log('[LudoGame] Time since leave:', timeSinceLeave, 'ms, auto-resume:', canAutoResume);
          }
          
          setHasActiveGame(true);
          setActiveGameData({
            matchId: activeMatch.id,
            entryAmount: Number(activeMatch.entry_amount),
            rewardAmount: Number(activeMatch.reward_amount),
            playerCount: activeMatch.player_count,
            gameState: activeMatch.game_state
          });
          
          if (canAutoResume) {
            // Set flag for auto-resume (will be picked up after activeGameData is set)
            setShouldAutoResume(true);
          } else {
            // Play alert sound for manual resume
            soundManager.playDisconnectAlert();
            hapticManager.warning();
          }
        }
      } catch (err) {
        console.error('[LudoGame] Error checking active game:', err);
      } finally {
        setIsCheckingActiveGame(false);
      }
    };

    checkActiveGame();
  }, [user]);

  // Auto-resume effect is defined after resumeGame callback below

  // Track when user leaves the game page (for auto-resume detection)
  useEffect(() => {
    if (gameState.phase === 'playing' && gameState.matchId) {
      // Update active timestamp periodically
      const updateActiveTime = () => {
        localStorage.setItem(`ludo_game_active_${gameState.matchId}`, Date.now().toString());
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
  }, [gameState.phase, gameState.matchId]);

  const getRandomBotName = useCallback((usedNames: string[]) => {
    const available = BOT_NAMES.filter(name => !usedNames.includes(name));
    return available[Math.floor(Math.random() * available.length)] || BOT_NAMES[0];
  }, []);

  const createInitialTokens = useCallback((color: string): Token[] => {
    return [0, 1, 2, 3].map(id => ({ id, position: 0, color }));
  }, []);

  // Resume an active game
  const resumeGame = useCallback(async () => {
    if (!user || !activeGameData) {
      toast({ title: 'No active game to resume', variant: 'destructive' });
      return;
    }

    try {
      // Fetch the match and players
      const { data: matchData, error: matchError } = await supabase
        .from('ludo_matches')
        .select(`
          *,
          ludo_match_players (
            user_id,
            is_bot,
            bot_name,
            bot_avatar_url,
            player_color,
            token_positions,
            tokens_home
          )
        `)
        .eq('id', activeGameData.matchId)
        .single();

      if (matchError || !matchData) {
        toast({ title: 'Failed to load game', variant: 'destructive' });
        setHasActiveGame(false);
        setActiveGameData(null);
        return;
      }

      // Reconstruct players
      const players: Player[] = matchData.ludo_match_players.map((p: any, index: number) => {
        const tokenPositions = Array.isArray(p.token_positions) ? p.token_positions : [0, 0, 0, 0];
        return {
          id: p.is_bot ? `bot-${index}` : p.user_id,
          name: p.is_bot ? (p.bot_name || `Bot ${index}`) : (userName || 'You'),
          uid: p.is_bot ? generateUID() : (userUID || generateUID()),
          avatar: p.is_bot ? (p.bot_avatar_url || undefined) : (userAvatar || undefined),
          isBot: p.is_bot,
          status: 'ready' as const,
          color: p.player_color,
          tokens: tokenPositions.map((pos: number, tid: number) => ({
            id: tid,
            position: pos,
            color: p.player_color
          })),
          tokensHome: p.tokens_home || 0
        };
      });

      // Determine current turn from game_state or default to user
      const savedState = matchData.game_state as any;
      const currentTurn = savedState?.currentTurn ?? 0;
      const diceValue = savedState?.diceValue ?? 1;

      // Set game state
      gameInProgressRef.current = true;
      // Check if dice was rolled this turn from saved state
      const hasRolledFromState = savedState?.hasRolled ?? false;
      
      setGameState({
        phase: 'playing',
        matchId: activeGameData.matchId,
        players,
        currentTurn,
        diceValue,
        isRolling: false,
        // Only allow roll if it's user's turn AND they haven't rolled yet
        canRoll: currentTurn === 0 && !hasRolledFromState,
        hasRolled: hasRolledFromState,
        selectedToken: null,
        winner: null
      });

      setEntryAmount(activeGameData.entryAmount);
      setPlayerMode(activeGameData.playerCount as 2 | 4);
      setHasActiveGame(false);
      setActiveGameData(null);

      toast({ title: '🎮 Game Resumed!', description: 'Continue where you left off' });
      soundManager.playWin();
    } catch (err) {
      console.error('[LudoGame] Error resuming game:', err);
      toast({ title: 'Failed to resume game', variant: 'destructive' });
    }
  }, [user, activeGameData, userUID, userAvatar, userName, toast]);

  // Auto-resume effect - triggered when shouldAutoResume becomes true and activeGameData is available
  useEffect(() => {
    if (shouldAutoResume && activeGameData && user) {
      console.log('[LudoGame] Auto-resuming game...');
      setShouldAutoResume(false);
      resumeGame();
    }
  }, [shouldAutoResume, activeGameData, user, resumeGame]);

  // Dismiss active game (forfeit)
  const dismissActiveGame = useCallback(async () => {
    if (!user || !activeGameData) return;

    try {
      // Mark match as cancelled
      await supabase
        .from('ludo_matches')
        .update({ 
          status: 'cancelled',
          ended_at: new Date().toISOString()
        })
        .eq('id', activeGameData.matchId);

      // No refund since game was in progress
      toast({ 
        title: 'Game Forfeited', 
        description: 'Entry fee was not refunded as the game was in progress',
        variant: 'destructive'
      });

      setHasActiveGame(false);
      setActiveGameData(null);
    } catch (err) {
      console.error('[LudoGame] Error dismissing game:', err);
    }
  }, [user, activeGameData, toast]);

  const startMatchmaking = useCallback(async (presetBots?: { name: string; avatar: string }[], overridePlayerMode?: 2 | 3 | 4) => {
    // Use override mode if provided (for joining challenges), otherwise use state
    const effectivePlayerMode = overridePlayerMode || playerMode;

    // Keep UI + derived values in sync (prevents 1v1 UI on 1v1v1 challenges)
    if (playerMode !== effectivePlayerMode) {
      setPlayerMode(effectivePlayerMode);
    }

    if (!user) {
      toast({ title: 'Please login to play', variant: 'destructive' });
      return;
    }

    if (walletBalance < entryAmount) {
      toast({ title: 'Insufficient balance', description: 'Please add funds to your wallet', variant: 'destructive' });
      return;
    }

    // Fetch fresh profile data for accurate name and avatar
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('username, avatar_url, user_code')
      .eq('id', user.id)
      .single();

    const currentUserName = freshProfile?.username || userName || 'You';
    const currentUserAvatar = freshProfile?.avatar_url || userAvatar || undefined;
    const currentUserUID = freshProfile?.user_code || userUID || generateUID();

    // Deduct entry from wallet AND reduce wager requirement
    const { data: profileData, error: profileFetchError } = await supabase
      .from('profiles')
      .select('wager_requirement')
      .eq('id', user.id)
      .single();
    
    const currentWager = Number(profileData?.wager_requirement || 0);
    const newWager = Math.max(0, currentWager - entryAmount);
    
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance: walletBalance - entryAmount,
        wager_requirement: newWager 
      })
      .eq('id', user.id);

    if (deductError) {
      toast({ title: 'Failed to deduct entry fee', variant: 'destructive' });
      return;
    }

    console.log(`[LudoGame] Wager reduced: ${currentWager} -> ${newWager} (bet: ${entryAmount})`);
    setWalletBalance(prev => prev - entryAmount);

    // Calculate reward based on player mode
    // 1v1: 1.5x, 1v1v1: 2.5x, 1v1v1v1: 3.5x
    const getRewardMultiplier = (mode: 2 | 3 | 4) => {
      switch (mode) {
        case 2: return settings.rewardMultiplier; // 1.5x
        case 3: return 2.5; // 2.5x for 1v1v1
        case 4: return 3.5; // 3.5x for 1v1v1v1
      }
    };
    const rewardAmount = entryAmount * getRewardMultiplier(effectivePlayerMode);
    const { data: match, error: matchError } = await supabase
      .from('ludo_matches')
      .insert({
        created_by: user.id,
        entry_amount: entryAmount,
        reward_amount: rewardAmount,
        player_count: effectivePlayerMode,
        status: 'waiting',
        difficulty: settings.difficulty
      })
      .select()
      .single();

    if (matchError || !match) {
      toast({ title: 'Failed to create match', variant: 'destructive' });
      await supabase.from('profiles').update({ wallet_balance: walletBalance }).eq('id', user.id);
      return;
    }

    // Add user as player
    const userColor = COLORS[0];
    await supabase.from('ludo_match_players').insert({
      match_id: match.id,
      user_id: user.id,
      is_bot: false,
      player_color: userColor,
      token_positions: [0, 0, 0, 0]
    });

    // Record transaction
    await supabase.from('ludo_transactions').insert({
      user_id: user.id,
      match_id: match.id,
      amount: -entryAmount,
      type: 'entry'
    });

    // Initialize user player with fresh profile data
    const userPlayer: Player = {
      id: user.id,
      name: currentUserName,
      uid: currentUserUID,
      avatar: currentUserAvatar,
      isBot: false,
      status: 'ready',
      color: userColor,
      tokens: createInitialTokens(userColor),
      tokensHome: 0
    };

    setGameState(prev => ({
      ...prev,
      phase: 'matchmaking',
      matchId: match.id,
      players: [userPlayer]
    }));

    // Build bot roster synchronously (fix: 1v1v1 / 1v1v1v1 sometimes stuck in `waiting` with missing bots)
    const botCount = effectivePlayerMode - 1;
    const usedNames: string[] = [];
    const usedAvatars: number[] = [];

    const botRows: Array<{
      match_id: string;
      is_bot: true;
      bot_name: string;
      bot_avatar_url: string | null;
      player_color: string;
      token_positions: number[];
    }> = [];

    const botPlayers: Player[] = [];

    for (let i = 1; i <= botCount; i++) {
      const presetBot = presetBots?.[i - 1];
      const botName = presetBot?.name?.trim() ? presetBot.name : getRandomBotName(usedNames);
      usedNames.push(botName);

      const botColor = COLORS[i];

      let botAvatar: string | undefined = presetBot?.avatar || undefined;
      if (!botAvatar) {
        let avatarIndex = Math.floor(Math.random() * CUSTOM_AVATARS.length);
        while (usedAvatars.includes(avatarIndex) && usedAvatars.length < CUSTOM_AVATARS.length) {
          avatarIndex = Math.floor(Math.random() * CUSTOM_AVATARS.length);
        }
        usedAvatars.push(avatarIndex);
        botAvatar = CUSTOM_AVATARS[avatarIndex]?.src;
      }

      botRows.push({
        match_id: match.id,
        is_bot: true,
        bot_name: botName,
        bot_avatar_url: botAvatar || null,
        player_color: botColor,
        token_positions: [0, 0, 0, 0]
      });

      botPlayers.push({
        id: `bot-${i}`,
        name: botName,
        uid: generateUID(),
        avatar: botAvatar,
        isBot: true,
        status: 'ready',
        color: botColor,
        tokens: createInitialTokens(botColor),
        tokensHome: 0
      });
    }

    if (botRows.length > 0) {
      const { error: botsError } = await supabase.from('ludo_match_players').insert(botRows);
      if (botsError) {
        console.error('[LudoGame] Failed to insert bots:', botsError);
        toast({ title: 'Failed to start match', variant: 'destructive' });
        // Best-effort rollback: cancel match and refund wallet
        await supabase.from('ludo_matches').update({ status: 'cancelled', ended_at: new Date().toISOString() }).eq('id', match.id);
        await supabase.from('profiles').update({ wallet_balance: walletBalance }).eq('id', user.id);
        setWalletBalance(walletBalance);
        return;
      }
    }

    // Mark match as started immediately so it can be resumed reliably
    const startedAt = new Date().toISOString();
    const { error: startError } = await supabase
      .from('ludo_matches')
      .update({
        status: 'in_progress',
        started_at: startedAt,
        game_state: { currentTurn: 0, diceValue: 1, hasRolled: false }
      })
      .eq('id', match.id);

    if (startError) {
      console.error('[LudoGame] Failed to start match:', startError);
      toast({ title: 'Failed to start match', variant: 'destructive' });
      await supabase.from('profiles').update({ wallet_balance: walletBalance }).eq('id', user.id);
      setWalletBalance(walletBalance);
      return;
    }

    gameInProgressRef.current = true;
    setGameState({
      phase: 'playing',
      matchId: match.id,
      players: [userPlayer, ...botPlayers],
      currentTurn: 0,
      diceValue: 1,
      isRolling: false,
      canRoll: true,
      hasRolled: false,
      selectedToken: null,
      winner: null
    });
  }, [user, walletBalance, entryAmount, playerMode, settings, toast, getRandomBotName, createInitialTokens, userUID, userAvatar, userName]);

  // Generate dice value - HIGH STAKES (>₹100) makes bots smarter BUT SUBTLE
  const generateDiceValue = useCallback((isBot: boolean, players?: Player[]): number => {
    const isHighStake = entryAmount > 100 && settings.highAmountCompetitive;
    
    // Calculate game progress to make manipulation progressive (less obvious)
    let playerProgress = 0;
    let botProgress = 0;
    if (players) {
      const humanPlayer = players.find(p => !p.isBot);
      const botPlayer = players.find(p => p.isBot);
      if (humanPlayer) {
        playerProgress = humanPlayer.tokens.reduce((sum, t) => sum + t.position, 0) + (humanPlayer.tokensHome * 57);
      }
      if (botPlayer) {
        botProgress = botPlayer.tokens.reduce((sum, t) => sum + t.position, 0) + (botPlayer.tokensHome * 57);
      }
    }
    
    // Intensity based on how close player is to winning (0-1 scale)
    const playerWinProximity = Math.min(playerProgress / 200, 1);
    const isBotBehind = botProgress < playerProgress;
    
    if (isBot) {
      if (isHighStake) {
        // SUBTLE STRATEGY: Start fair, get harder as player progresses
        // If bot is behind or player is close to winning, increase advantage
        let weights = [0.14, 0.14, 0.16, 0.18, 0.19, 0.19]; // Slightly better than fair
        
        if (isBotBehind && playerWinProximity > 0.3) {
          // Bot falling behind - increase good dice probability subtly
          weights = [0.10, 0.12, 0.15, 0.18, 0.22, 0.23];
        }
        
        if (playerWinProximity > 0.6) {
          // Player close to winning - bot needs clutch rolls
          weights = [0.08, 0.10, 0.14, 0.20, 0.24, 0.24];
        }
        
        // Add some randomness to make it feel natural (sometimes bot rolls bad)
        if (Math.random() < 0.15) {
          // 15% chance of truly random roll (keeps it believable)
          return Math.floor(Math.random() * 6) + 1;
        }
        
        const rand = Math.random();
        let cumulative = 0;
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (rand < cumulative) return i + 1;
        }
        return 5;
      }
      
      // Normal difficulty-based weights
      const weights = {
        easy: [0.2, 0.2, 0.2, 0.2, 0.1, 0.1],
        normal: [0.167, 0.167, 0.167, 0.167, 0.167, 0.167],
        competitive: [0.1, 0.1, 0.15, 0.2, 0.2, 0.25]
      };
      const w = weights[settings.difficulty];
      const rand = Math.random();
      let cumulative = 0;
      for (let i = 0; i < w.length; i++) {
        cumulative += w[i];
        if (rand < cumulative) return i + 1;
      }
      return 6;
    }
    
    // Player dice - HIGH STAKE: subtle manipulation based on game state
    if (isHighStake) {
      // If player is behind, give them slightly better dice (keeps them engaged)
      if (botProgress > playerProgress + 50) {
        // Player way behind - let them catch up a bit (keeps game interesting)
        const catchUpWeights = [0.15, 0.15, 0.16, 0.18, 0.18, 0.18];
        const rand = Math.random();
        let cumulative = 0;
        for (let i = 0; i < catchUpWeights.length; i++) {
          cumulative += catchUpWeights[i];
          if (rand < cumulative) return i + 1;
        }
        return 4;
      }
      
      // Player ahead or close game - subtle disadvantage
      let playerWeights = [0.17, 0.17, 0.17, 0.17, 0.16, 0.16]; // Slightly less 5s and 6s
      
      if (playerWinProximity > 0.5) {
        // Player getting close to winning - reduce good rolls more
        playerWeights = [0.18, 0.18, 0.17, 0.17, 0.16, 0.14];
      }
      
      // Add randomness to keep it natural
      if (Math.random() < 0.2) {
        return Math.floor(Math.random() * 6) + 1;
      }
      
      const rand = Math.random();
      let cumulative = 0;
      for (let i = 0; i < playerWeights.length; i++) {
        cumulative += playerWeights[i];
        if (rand < cumulative) return i + 1;
      }
      return 4;
    }
    
    return Math.floor(Math.random() * 6) + 1;
  }, [settings.difficulty, settings.highAmountCompetitive, entryAmount]);

  // Move token with CORRECT capture logic using board coordinates
  const moveToken = useCallback((color: string, tokenId: number, diceValue: number, players: Player[]): { 
    updatedPlayers: Player[]; 
    winner: Player | null; 
    gotSix: boolean; 
    capturedOpponent: boolean;
    captureInfo: { capturedColor: string; position: number; capturingColor: string } | null;
  } => {
    soundManager.playTokenMove();
    hapticManager.tokenMove();
    
    let winner: Player | null = null;
    let capturedOpponent = false;
    let captureInfo: { capturedColor: string; position: number; capturingColor: string } | null = null;
    let newBoardCoords: { x: number; y: number } | null = null;
    let newPosition = 0;

    // Calculate new position first
    const movingPlayer = players.find(p => p.color === color);
    const movingToken = movingPlayer?.tokens.find(t => t.id === tokenId);
    
    if (movingToken) {
      const oldPosition = movingToken.position;
      if (movingToken.position === 0 && diceValue === 6) {
        newPosition = 1;
      } else if (movingToken.position > 0) {
        newPosition = Math.min(movingToken.position + diceValue, 57);
      }
      newBoardCoords = getBoardCoords(newPosition, color);
      
      // Debug logging
      console.log('[LudoGame] Token Move:', {
        color,
        tokenId,
        diceValue,
        oldPosition,
        newPosition,
        expectedMove: diceValue,
        actualMove: newPosition - oldPosition
      });
    }
    
    const updatedPlayers = players.map(player => {
      if (player.color === color) {
        // Update moving player's token
        const updatedTokens = player.tokens.map(token => {
          if (token.id !== tokenId) return token;

          let finalPosition = token.position;
          if (token.position === 0 && diceValue === 6) {
            finalPosition = 1;
            soundManager.playTokenEnter();
            hapticManager.tokenEnter();
          } else if (token.position > 0) {
            finalPosition = Math.min(token.position + diceValue, 57);
            if (finalPosition === 57) {
              soundManager.playTokenHome();
              hapticManager.tokenHome();
            }
          }

          return { ...token, position: finalPosition };
        });

        const tokensHome = updatedTokens.filter(t => t.position === 57).length;
        const updatedPlayer = { ...player, tokens: updatedTokens, tokensHome };
        
        if (tokensHome === 4) {
          winner = updatedPlayer;
        }

        return updatedPlayer;
      } else {
        // Check capture using BOARD COORDINATES
        if (!newBoardCoords || newPosition >= 52 || newPosition === 0) {
          return player;
        }
        
        // Check if new position is a safe spot
        if (isSafePosition(newBoardCoords)) {
          console.log('[LudoGame] Capture check: Safe position - no capture', {
            newBoardCoords,
            newPosition
          });
          return player;
        }

        // Check each opponent token
        const updatedTokens = player.tokens.map(token => {
          if (token.position <= 0 || token.position >= 52) return token;
          
          const opponentCoords = getBoardCoords(token.position, player.color);
          if (!opponentCoords) return token;
          
          // Debug: Log capture check
          console.log('[LudoGame] Capture check:', {
            movingColor: color,
            movingNewPos: newPosition,
            movingCoords: newBoardCoords,
            opponentColor: player.color,
            opponentTokenId: token.id,
            opponentPos: token.position,
            opponentCoords,
            willCapture: opponentCoords.x === newBoardCoords!.x && opponentCoords.y === newBoardCoords!.y
          });
          
          // Compare BOARD coordinates
          if (opponentCoords.x === newBoardCoords!.x && opponentCoords.y === newBoardCoords!.y) {
            capturedOpponent = true;
            captureInfo = {
              capturedColor: player.color,
              position: newPosition,
              capturingColor: color
            };
            console.log('[LudoGame] 🎯 CAPTURE DETECTED!', {
              capturer: color,
              captured: player.color,
              tokenId: token.id,
              atCoords: newBoardCoords
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
        hapticManager.tokenCapture();
      }, 200);
    }

    return { updatedPlayers, winner, gotSix: diceValue === 6, capturedOpponent, captureInfo };
  }, []);

  // Sync game state to database for resume capability
  const syncGameStateToDb = useCallback(async (matchId: string, players: Player[], currentTurn: number, diceValue: number, hasRolled: boolean) => {
    try {
      // Save game state
      await supabase.from('ludo_matches').update({
        game_state: {
          currentTurn,
          diceValue,
          hasRolled
        }
      }).eq('id', matchId);
      
      // Also update player token positions
      for (const player of players) {
        const tokenPositions = player.tokens.map(t => t.position);
        if (player.isBot) {
          await supabase.from('ludo_match_players').update({
            token_positions: tokenPositions,
            tokens_home: player.tokensHome
          }).eq('match_id', matchId).eq('is_bot', true).eq('player_color', player.color);
        } else {
          await supabase.from('ludo_match_players').update({
            token_positions: tokenPositions,
            tokens_home: player.tokensHome
          }).eq('match_id', matchId).eq('user_id', player.id);
        }
      }
    } catch (err) {
      console.error('[LudoGame] Failed to sync game state:', err);
    }
  }, []);

  // Bot AI - SMARTER for high stakes (SUBTLE WINNING STRATEGY)
  const selectBotMove = useCallback((player: Player, diceValue: number, allPlayers: Player[]): number | null => {
    const isHighStake = entryAmount > 100 && settings.highAmountCompetitive;
    
    const movableTokens = player.tokens.filter(token => {
      if (token.position === 0 && diceValue === 6) return true;
      if (token.position > 0 && token.position + diceValue <= 57) return true;
      return false;
    });

    if (movableTokens.length === 0) return null;

    // Find human player for strategic decisions
    const humanPlayer = allPlayers.find(p => !p.isBot);
    
    // Priority 1: Token that can reach home (always take this)
    const tokenToHome = movableTokens.find(t => t.position > 0 && t.position + diceValue === 57);
    if (tokenToHome) return tokenToHome.id;

    // Priority 2 (HIGH STAKE): Aggressive capture hunting
    if (isHighStake) {
      // Find ALL capture opportunities and pick the best one
      let bestCaptureToken: number | null = null;
      let bestCaptureScore = 0;
      
      for (const token of movableTokens) {
        if (token.position === 0) continue;
        const newPos = token.position + diceValue;
        if (newPos >= 52) continue;
        
        const newCoords = getBoardCoords(newPos, player.color);
        if (!newCoords || isSafePosition(newCoords)) continue;
        
        // Check if any opponent is at this position
        for (const opponent of allPlayers) {
          if (opponent.color === player.color || opponent.isBot) continue; // Prioritize capturing HUMAN
          for (const oppToken of opponent.tokens) {
            if (oppToken.position <= 0 || oppToken.position >= 52) continue;
            const oppCoords = getBoardCoords(oppToken.position, opponent.color);
            if (oppCoords && oppCoords.x === newCoords.x && oppCoords.y === newCoords.y) {
              // Score based on how far the opponent token was (capture advanced tokens)
              const captureScore = oppToken.position;
              if (captureScore > bestCaptureScore) {
                bestCaptureScore = captureScore;
                bestCaptureToken = token.id;
              }
            }
          }
        }
      }
      
      if (bestCaptureToken !== null) {
        return bestCaptureToken;
      }
    }

    // Priority 3: Get token out of base with 6
    if (diceValue === 6) {
      const tokenInHome = movableTokens.find(t => t.position === 0);
      if (tokenInHome) return tokenInHome.id;
    }

    // Priority 4 (HIGH STAKE): Move to block human player's path
    if (isHighStake && humanPlayer) {
      for (const token of movableTokens) {
        if (token.position === 0) continue;
        const newPos = token.position + diceValue;
        if (newPos >= 52) continue;
        
        const newCoords = getBoardCoords(newPos, player.color);
        if (!newCoords) continue;
        
        // Check if this position is ahead of human's most advanced token
        for (const humanToken of humanPlayer.tokens) {
          if (humanToken.position <= 0 || humanToken.position >= 52) continue;
          const humanCoords = getBoardCoords(humanToken.position, humanPlayer.color);
          if (!humanCoords) continue;
          
          // Check if we'd be 1-6 steps ahead of human token (blocking zone)
          for (let lookAhead = 1; lookAhead <= 6; lookAhead++) {
            const humanFuturePos = humanToken.position + lookAhead;
            if (humanFuturePos >= 52) continue;
            const humanFutureCoords = getBoardCoords(humanFuturePos, humanPlayer.color);
            if (humanFutureCoords && 
                humanFutureCoords.x === newCoords.x && 
                humanFutureCoords.y === newCoords.y &&
                !isSafePosition(newCoords)) {
              // This position blocks human's path and they might land on us (risky for them)
              return token.id;
            }
          }
        }
      }
    }

    // Priority 5 (HIGH STAKE): Move token closest to home (race to win)
    if (isHighStake) {
      // Prefer tokens in home stretch (position > 51) or close to it
      const homeStretchTokens = movableTokens.filter(t => t.position > 45);
      if (homeStretchTokens.length > 0) {
        const closest = homeStretchTokens.reduce((prev, curr) => 
          curr.position > prev.position ? curr : prev
        );
        return closest.id;
      }
      
      // Otherwise move most advanced token
      const sortedByProgress = [...movableTokens].sort((a, b) => b.position - a.position);
      return sortedByProgress[0].id;
    }

    // Priority 6 (HIGH STAKE): Avoid moving token to dangerous positions
    if (isHighStake && humanPlayer) {
      // Filter out tokens that would land in capture range of human
      const safeMovableTokens = movableTokens.filter(token => {
        if (token.position === 0) return true; // Getting out is always good
        const newPos = token.position + diceValue;
        if (newPos >= 52) return true; // Home stretch is safe
        
        const newCoords = getBoardCoords(newPos, player.color);
        if (!newCoords) return true;
        if (isSafePosition(newCoords)) return true; // Safe spot
        
        // Check if human can capture us at this position
        for (const humanToken of humanPlayer.tokens) {
          if (humanToken.position <= 0 || humanToken.position >= 52) continue;
          for (let rollValue = 1; rollValue <= 6; rollValue++) {
            const humanFuturePos = humanToken.position + rollValue;
            if (humanFuturePos >= 52) continue;
            const humanFutureCoords = getBoardCoords(humanFuturePos, humanPlayer.color);
            if (humanFutureCoords && 
                humanFutureCoords.x === newCoords.x && 
                humanFutureCoords.y === newCoords.y) {
              return false; // Dangerous position
            }
          }
        }
        return true;
      });
      
      if (safeMovableTokens.length > 0) {
        const bestSafe = safeMovableTokens.reduce((prev, curr) => 
          curr.position > prev.position ? curr : prev
        );
        return bestSafe.id;
      }
    }

    // Default: Move furthest token
    const furthestToken = movableTokens.reduce((prev, curr) => 
      curr.position > prev.position ? curr : prev
    );
    return furthestToken.id;
  }, [entryAmount, settings.highAmountCompetitive]);

  // Bot turn execution - with realistic human-like delays
  const executeBotTurn = useCallback(async () => {
    if (!gameInProgressRef.current || botTurnRef.current) return;
    
    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentTurn];
      if (!currentPlayer?.isBot || prev.phase !== 'playing' || prev.winner) {
        return prev;
      }
      
      botTurnRef.current = true;

      // Realistic "thinking" delay before rolling (800ms - 2000ms)
      const thinkingDelay = 800 + Math.floor(Math.random() * 1200);
      
      setTimeout(() => {
        setGameState(inner => ({ ...inner, isRolling: true, canRoll: false }));
        
        // Dice roll animation time (600ms - 1000ms)
        const rollDuration = 600 + Math.floor(Math.random() * 400);
        
        setTimeout(() => {
          setGameState(rollState => {
            const diceValue = generateDiceValue(true, rollState.players);
            const botPlayer = rollState.players[rollState.currentTurn];
            if (!botPlayer?.isBot) {
              botTurnRef.current = false;
              return rollState;
            }

            const tokenId = selectBotMove(botPlayer, diceValue, rollState.players);
            
            if (tokenId !== null) {
              // Realistic delay before moving token (500ms - 1200ms) - like thinking which token to move
              const moveThinkingDelay = 500 + Math.floor(Math.random() * 700);
              setTimeout(() => {
                setGameState(moveState => {
                  const { updatedPlayers, winner, gotSix, captureInfo } = moveToken(
                    botPlayer.color, 
                    tokenId, 
                    diceValue, 
                    moveState.players
                  );

                  // Trigger capture animation
                  if (captureInfo) {
                    setCaptureEvent(captureInfo);
                  }

                  if (winner) {
                    gameInProgressRef.current = false;
                    botTurnRef.current = false;
                    return {
                      ...moveState,
                      players: updatedPlayers,
                      diceValue,
                      isRolling: false,
                      phase: 'result',
                      winner,
                      canRoll: false
                    };
                  }

                  if (gotSix) {
                    botTurnRef.current = false;
                    // Delay before next turn on 6 (600ms - 1200ms)
                    setTimeout(() => executeBotTurn(), 600 + Math.floor(Math.random() * 600));
                    return {
                      ...moveState,
                      players: updatedPlayers,
                      diceValue,
                      isRolling: false,
                      canRoll: false
                    };
                  }

                  const nextTurn = (moveState.currentTurn + 1) % moveState.players.length;
                  const isNextUser = !moveState.players[nextTurn]?.isBot;
                  
                  botTurnRef.current = false;
                  soundManager.playTurnChange();
                  
                  if (!isNextUser) {
                    // Delay before next bot's turn (1000ms - 1800ms)
                    setTimeout(() => executeBotTurn(), 1000 + Math.floor(Math.random() * 800));
                  }
                  
                  return {
                    ...moveState,
                    players: updatedPlayers,
                    diceValue,
                    isRolling: false,
                    currentTurn: nextTurn,
                    canRoll: isNextUser,
                    selectedToken: null
                  };
                });
              }, 300);

              return { ...rollState, diceValue, isRolling: false };
            } else {
              // No movable token - realistic wait before skipping (400ms - 800ms)
              const skipDelay = 400 + Math.floor(Math.random() * 400);
              setTimeout(() => {
                const nextTurn = (rollState.currentTurn + 1) % rollState.players.length;
                const isNextUser = !rollState.players[nextTurn]?.isBot;
                
                botTurnRef.current = false;
                soundManager.playTurnChange();
                
                if (!isNextUser) {
                  // Delay before next bot's turn (1000ms - 1800ms)
                  setTimeout(() => executeBotTurn(), 1000 + Math.floor(Math.random() * 800));
                }
                
                setGameState(skipState => ({
                  ...skipState,
                  currentTurn: nextTurn,
                  canRoll: isNextUser,
                  selectedToken: null
                }));
              }, skipDelay);

              return { ...rollState, diceValue, isRolling: false };
            }
          });
        }, rollDuration);
      }, thinkingDelay);

      return prev;
    });
  }, [generateDiceValue, selectBotMove, moveToken]);

  // Trigger bot turns
  useEffect(() => {
    if (gameState.phase !== 'playing' || gameState.winner || botTurnRef.current) return;
    
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer?.isBot && !gameState.isRolling) {
      const timer = setTimeout(() => executeBotTurn(), 600);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, gameState.phase, gameState.winner, gameState.isRolling, executeBotTurn]);

  // User roll dice
  const rollDice = useCallback(async () => {
    // Use lastUserId during token refresh for continuity
    const effectiveUserId = user?.id || (isRefreshing ? lastUserId : null);
    
    if (!gameState.canRoll || gameState.isRolling) {
      console.log('[LudoGame Bot] Roll blocked:', { 
        canRoll: gameState.canRoll, 
        isRolling: gameState.isRolling,
        isRefreshing 
      });
      return;
    }
    
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer) {
      console.error('[LudoGame Bot] No current player at turn:', gameState.currentTurn);
      return;
    }
    
    if (currentPlayer.isBot) {
      console.log('[LudoGame Bot] Cannot roll for bot');
      return;
    }
    
    // Validate user is the current player (use effective ID during refresh)
    if (effectiveUserId && currentPlayer.id !== effectiveUserId) {
      console.error('[LudoGame Bot] User ID mismatch!', { 
        currentPlayerId: currentPlayer.id, 
        userId: effectiveUserId,
        isRefreshing 
      });
      return;
    }

    console.log('[LudoGame Bot] User rolling dice, effectiveUserId:', effectiveUserId);
    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false, hasRolled: true }));

    await new Promise(resolve => setTimeout(resolve, 800));

    const diceValue = generateDiceValue(false, gameState.players);
    
    setGameState(prev => {
      const player = prev.players[prev.currentTurn];
      
      // Revalidate player
      if (!player || player.isBot) {
        console.error('[LudoGame Bot] Invalid player state after roll');
        return { ...prev, isRolling: false };
      }
      
      const canMove = player.tokens.some(token => {
        if (token.position === 0 && diceValue === 6) return true;
        if (token.position > 0 && token.position + diceValue <= 57) return true;
        return false;
      });

      if (!canMove) {
        setTimeout(() => {
          const nextTurn = (prev.currentTurn + 1) % prev.players.length;
          const isNextUser = !prev.players[nextTurn]?.isBot;
          soundManager.playTurnChange();
          
          setGameState(inner => ({
            ...inner,
            currentTurn: nextTurn,
            canRoll: isNextUser,
            hasRolled: false, // Reset for next turn
            selectedToken: null
          }));
          
          if (!isNextUser) {
            setTimeout(() => executeBotTurn(), 800);
          }
        }, 600);
        
        // No valid moves, reset hasRolled for turn switch
        return { ...prev, diceValue, isRolling: false, hasRolled: false };
      }

      // Player can move - hasRolled stays true until they move a token
      // Sync to DB for resume capability
      if (gameState.matchId) {
        syncGameStateToDb(gameState.matchId, prev.players, prev.currentTurn, diceValue, true);
      }
      return { ...prev, diceValue, isRolling: false, hasRolled: true };
    });
  }, [gameState.canRoll, gameState.isRolling, gameState.players, gameState.currentTurn, gameState.matchId, user, isRefreshing, lastUserId, generateDiceValue, executeBotTurn, syncGameStateToDb]);

  // Handle user token click
  const handleTokenClick = useCallback((color: string, tokenId: number) => {
    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentTurn];
      
      if (!currentPlayer) {
        console.error('[LudoGame Bot] No current player for token click');
        return prev;
      }
      
      if (currentPlayer.color !== color) {
        console.log('[LudoGame Bot] Token click blocked: wrong color');
        return prev;
      }
      
      if (currentPlayer.isBot) {
        console.log('[LudoGame Bot] Token click blocked: bot turn');
        return prev;
      }
      
      if (prev.canRoll) {
        console.log('[LudoGame Bot] Token click blocked: must roll first');
        return prev;
      }
      
      // Validate user ID if available
      if (user && currentPlayer.id !== user.id) {
        console.error('[LudoGame Bot] Token click blocked: user ID mismatch', { currentPlayerId: currentPlayer.id, userId: user.id });
        return prev;
      }

      const token = currentPlayer.tokens.find(t => t.id === tokenId);
      if (!token) return prev;

      const canMove = 
        (token.position === 0 && prev.diceValue === 6) ||
        (token.position > 0 && token.position + prev.diceValue <= 57);

      if (!canMove) return prev;

      const { updatedPlayers, winner, gotSix, captureInfo } = moveToken(color, tokenId, prev.diceValue, prev.players);

      // Trigger capture animation
      if (captureInfo) {
        setCaptureEvent(captureInfo);
      }

      if (winner) {
        gameInProgressRef.current = false;
        return {
          ...prev,
          players: updatedPlayers,
          phase: 'result',
          winner,
          canRoll: false
        };
      }

      if (gotSix) {
        // Sync state - player rolled 6 and can roll again
        if (gameState.matchId) {
          syncGameStateToDb(gameState.matchId, updatedPlayers, prev.currentTurn, prev.diceValue, false);
        }
        return {
          ...prev,
          players: updatedPlayers,
          canRoll: true,
          hasRolled: false, // Reset so player can roll again
          selectedToken: null
        };
      }

      const nextTurn = (prev.currentTurn + 1) % prev.players.length;
      const isNextUser = !prev.players[nextTurn]?.isBot;
      
      soundManager.playTurnChange();
      
      if (!isNextUser) {
        setTimeout(() => executeBotTurn(), 800);
      }

      // Sync state after turn change
      if (gameState.matchId) {
        syncGameStateToDb(gameState.matchId, updatedPlayers, nextTurn, prev.diceValue, false);
      }

      return {
        ...prev,
        players: updatedPlayers,
        currentTurn: nextTurn,
        canRoll: isNextUser,
        hasRolled: false, // Reset for next turn
        selectedToken: null
      };
    });
  }, [moveToken, executeBotTurn, gameState.matchId, syncGameStateToDb]);

  const handleGameEnd = useCallback(async (winner: Player) => {
    if (!user || !gameState.matchId) return;

    const isUserWinner = winner.id === user.id;
    const rewardAmount = entryAmount * settings.rewardMultiplier;

    await supabase.from('ludo_matches').update({
      status: 'completed',
      winner_id: isUserWinner ? user.id : null,
      ended_at: new Date().toISOString()
    }).eq('id', gameState.matchId);

    if (isUserWinner) {
      await supabase.from('profiles').update({
        wallet_balance: walletBalance + rewardAmount
      }).eq('id', user.id);

      await supabase.from('ludo_transactions').insert({
        user_id: user.id,
        match_id: gameState.matchId,
        amount: rewardAmount,
        type: 'win'
      });

      setWalletBalance(prev => prev + rewardAmount);

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🎉 Ludo Victory!',
        message: `You won ₹${rewardAmount} in Ludo!`,
        type: 'success'
      });
    }
  }, [user, gameState.matchId, entryAmount, settings.rewardMultiplier, walletBalance]);

  const resetGame = useCallback(() => {
    gameInProgressRef.current = false;
    botTurnRef.current = false;
    setGameState({
      phase: 'idle',
      matchId: null,
      players: [],
      currentTurn: 0,
      diceValue: 1,
      isRolling: false,
      canRoll: false,
      hasRolled: false,
      selectedToken: null,
      winner: null
    });
  }, []);

  // Clear capture event
  const clearCaptureEvent = useCallback(() => {
    setCaptureEvent(null);
  }, []);

  // Handle winner
  useEffect(() => {
    if (gameState.winner) {
      handleGameEnd(gameState.winner);
    }
  }, [gameState.winner, handleGameEnd]);

  // Turn timer effect - 15 seconds per turn
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
          // Time's up - skip to next turn
          const currentPlayer = gameState.players[gameState.currentTurn];
          const isUserTurn = currentPlayer && !currentPlayer.isBot && user && currentPlayer.id === user.id;
          
          if (isUserTurn) {
            // Auto-skip user's turn
            toast({
              title: "Time's up!",
              description: "Turn skipped to opponent",
              variant: "destructive"
            });
            
            // Move to next player
            const nextTurn = (gameState.currentTurn + 1) % gameState.players.length;
            setGameState(prev => ({
              ...prev,
              currentTurn: nextTurn,
              canRoll: true,
              selectedToken: null
            }));
          }
          return 15; // Reset timer for next turn
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
  }, [gameState.phase, gameState.currentTurn, gameState.players, user, toast]);

  // Skip turn function for manual timeout handling
  const skipTurn = useCallback(() => {
    if (gameState.phase !== 'playing') return;
    
    const nextTurn = (gameState.currentTurn + 1) % gameState.players.length;
    setGameState(prev => ({
      ...prev,
      currentTurn: nextTurn,
      canRoll: true,
      selectedToken: null
    }));
    setTurnTimeLeft(15);
  }, [gameState.phase, gameState.currentTurn, gameState.players.length]);

  // Calculate reward based on player mode for return value
  const getReturnRewardAmount = () => {
    switch (playerMode) {
      case 2: return entryAmount * settings.rewardMultiplier; // 1.5x
      case 3: return entryAmount * 2.5; // 2.5x for 1v1v1
      case 4: return entryAmount * 3.5; // 3.5x for 1v1v1v1
    }
  };

  return {
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
    rewardAmount: getReturnRewardAmount(),
    captureEvent,
    clearCaptureEvent,
    // Resume game functionality
    hasActiveGame,
    activeGameData,
    isCheckingActiveGame,
    resumeGame,
    dismissActiveGame,
    // Timer states
    turnTimeLeft,
    offlineTimeLeft,
    skipTurn,
    // User profile data
    userAvatar
  };
};
