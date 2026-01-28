import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BOT_NAMES } from '@/components/ludo/MatchmakingScreen';
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
  selectedToken: { color: string; tokenId: number } | null;
  winner: Player | null;
}

interface LudoSettings {
  isEnabled: boolean;
  minEntryAmount: number;
  rewardMultiplier: number;
  difficulty: 'easy' | 'normal' | 'competitive';
}

const COLORS = ['red', 'green', 'yellow', 'blue'];

// Track coordinates for each color (same as LudoBoard.tsx)
// These map position numbers to actual board grid coordinates
const COLOR_TRACK_COORDS: { [color: string]: { x: number; y: number }[] } = {
  // Red (top-left) starts from left lane
  red: [
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
  ],
  // Green (top-right) starts from top lane
  green: [
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
  ],
  // Yellow (bottom-right) starts from right lane
  yellow: [
    { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
    { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
    { x: 7.5, y: 14.5 },
    { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
    { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
    { x: 0.5, y: 7.5 },
    { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
    { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
    { x: 7.5, y: 0.5 },
    { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
    { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
    { x: 14.5, y: 7.5 },
  ],
  // Blue (bottom-left) starts from bottom lane
  blue: [
    { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
    { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
    { x: 0.5, y: 7.5 },
    { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
    { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
    { x: 7.5, y: 0.5 },
    { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
    { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
    { x: 14.5, y: 7.5 },
    { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
    { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
    { x: 7.5, y: 14.5 },
  ],
};

// Safe positions (board coordinates) - starting stars and safe spots
const SAFE_POSITIONS = [
  // Starting stars
  { x: 1.5, y: 6.5 },   // Red start
  { x: 8.5, y: 1.5 },   // Green start
  { x: 13.5, y: 8.5 },  // Yellow start
  { x: 6.5, y: 13.5 },  // Blue start
  // Safe spots
  { x: 2.5, y: 7.5 },
  { x: 7.5, y: 2.5 },
  { x: 12.5, y: 7.5 },
  { x: 7.5, y: 12.5 },
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
  const { user } = useAuth();
  const { toast } = useToast();
  const botTurnRef = useRef<boolean>(false);
  const gameInProgressRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null); // Track user ID for consistency
  
  const [settings, setSettings] = useState<LudoSettings>({
    isEnabled: true,
    minEntryAmount: 100,
    rewardMultiplier: 1.5,
    difficulty: 'normal'
  });
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    matchId: null,
    players: [],
    currentTurn: 0,
    diceValue: 1,
    isRolling: false,
    canRoll: false,
    selectedToken: null,
    winner: null
  });
  
  // Track user ID changes
  useEffect(() => {
    if (user?.id) {
      if (userIdRef.current && userIdRef.current !== user.id) {
        console.warn('[LudoGame] User ID changed during session!', {
          old: userIdRef.current,
          new: user.id
        });
        // Reset game state if user changes
        if (gameState.phase !== 'idle') {
          console.log('[LudoGame] Resetting game due to user change');
          setGameState({
            phase: 'idle',
            matchId: null,
            players: [],
            currentTurn: 0,
            diceValue: 1,
            isRolling: false,
            canRoll: false,
            selectedToken: null,
            winner: null
          });
        }
      }
      userIdRef.current = user.id;
    }
  }, [user?.id, gameState.phase]);
  
  const [entryAmount, setEntryAmount] = useState(100);
  const [playerMode, setPlayerMode] = useState<2 | 4>(2);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userUID, setUserUID] = useState<string>('');
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

  // Fetch user profile and UID
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance, user_code')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setWalletBalance(Number(data.wallet_balance));
        setUserUID(data.user_code || generateUID());
      }
    };
    
    fetchProfile();
  }, [user]);

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
          difficulty: data.difficulty as LudoSettings['difficulty']
        });
        setEntryAmount(Number(data.min_entry_amount));
      }
    };
    
    fetchSettings();
  }, []);

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
            ludo_match_players!inner (
              user_id,
              is_bot,
              bot_name,
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
          setHasActiveGame(true);
          setActiveGameData({
            matchId: activeMatch.id,
            entryAmount: Number(activeMatch.entry_amount),
            rewardAmount: Number(activeMatch.reward_amount),
            playerCount: activeMatch.player_count,
            gameState: activeMatch.game_state
          });
          
          // Play alert sound
          soundManager.playDisconnectAlert();
          hapticManager.warning();
        }
      } catch (err) {
        console.error('[LudoGame] Error checking active game:', err);
      } finally {
        setIsCheckingActiveGame(false);
      }
    };

    checkActiveGame();
  }, [user]);

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
          name: p.is_bot ? (p.bot_name || `Bot ${index}`) : (user.email?.split('@')[0] || 'You'),
          uid: p.is_bot ? generateUID() : (userUID || generateUID()),
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
      setGameState({
        phase: 'playing',
        matchId: activeGameData.matchId,
        players,
        currentTurn,
        diceValue,
        isRolling: false,
        canRoll: currentTurn === 0, // User's turn
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
  }, [user, activeGameData, userUID, toast]);

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

  const startMatchmaking = useCallback(async () => {
    if (!user) {
      toast({ title: 'Please login to play', variant: 'destructive' });
      return;
    }

    if (walletBalance < entryAmount) {
      toast({ title: 'Insufficient balance', description: 'Please add funds to your wallet', variant: 'destructive' });
      return;
    }

    // Deduct entry from wallet
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ wallet_balance: walletBalance - entryAmount })
      .eq('id', user.id);

    if (deductError) {
      toast({ title: 'Failed to deduct entry fee', variant: 'destructive' });
      return;
    }

    setWalletBalance(prev => prev - entryAmount);

    // Create match
    const rewardAmount = entryAmount * settings.rewardMultiplier;
    const { data: match, error: matchError } = await supabase
      .from('ludo_matches')
      .insert({
        created_by: user.id,
        entry_amount: entryAmount,
        reward_amount: rewardAmount,
        player_count: playerMode,
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

    // Initialize user player
    const userPlayer: Player = {
      id: user.id,
      name: user.email?.split('@')[0] || 'You',
      uid: userUID || generateUID(),
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

    // Simulate bot joining
    const usedNames: string[] = [];
    for (let i = 1; i < playerMode; i++) {
      setTimeout(async () => {
        const botName = getRandomBotName(usedNames);
        usedNames.push(botName);
        const botColor = COLORS[i];

        await supabase.from('ludo_match_players').insert({
          match_id: match.id,
          is_bot: true,
          bot_name: botName,
          player_color: botColor,
          token_positions: [0, 0, 0, 0]
        });

        const botPlayer: Player = {
          id: `bot-${i}`,
          name: botName,
          uid: generateUID(),
          isBot: true,
          status: 'connecting',
          color: botColor,
          tokens: createInitialTokens(botColor),
          tokensHome: 0
        };

        setGameState(prev => ({
          ...prev,
          players: [...prev.players, botPlayer]
        }));

        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => 
              p.id === botPlayer.id ? { ...p, status: 'ready' } : p
            )
          }));
        }, 500 + Math.random() * 500);
      }, 1000 * i + Math.random() * 800);
    }

    // Start game
    setTimeout(() => {
      gameInProgressRef.current = true;
      setGameState(prev => ({
        ...prev,
        phase: 'playing',
        canRoll: true,
        currentTurn: 0
      }));

      supabase.from('ludo_matches').update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      }).eq('id', match.id);
    }, 1500 * playerMode + 500);
  }, [user, walletBalance, entryAmount, playerMode, settings, toast, getRandomBotName, createInitialTokens, userUID]);

  // Generate dice value
  const generateDiceValue = useCallback((isBot: boolean): number => {
    if (isBot) {
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
    return Math.floor(Math.random() * 6) + 1;
  }, [settings.difficulty]);

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
      if (movingToken.position === 0 && diceValue === 6) {
        newPosition = 1;
      } else if (movingToken.position > 0) {
        newPosition = Math.min(movingToken.position + diceValue, 57);
      }
      newBoardCoords = getBoardCoords(newPosition, color);
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
          return player;
        }

        // Check each opponent token
        const updatedTokens = player.tokens.map(token => {
          if (token.position <= 0 || token.position >= 52) return token;
          
          const opponentCoords = getBoardCoords(token.position, player.color);
          if (!opponentCoords) return token;
          
          // Compare BOARD coordinates
          if (opponentCoords.x === newBoardCoords!.x && opponentCoords.y === newBoardCoords!.y) {
            capturedOpponent = true;
            captureInfo = {
              capturedColor: player.color,
              position: newPosition,
              capturingColor: color
            };
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

  // Bot AI
  const selectBotMove = useCallback((player: Player, diceValue: number): number | null => {
    const movableTokens = player.tokens.filter(token => {
      if (token.position === 0 && diceValue === 6) return true;
      if (token.position > 0 && token.position + diceValue <= 57) return true;
      return false;
    });

    if (movableTokens.length === 0) return null;

    const tokenToHome = movableTokens.find(t => t.position > 0 && t.position + diceValue === 57);
    if (tokenToHome) return tokenToHome.id;

    if (diceValue === 6) {
      const tokenInHome = movableTokens.find(t => t.position === 0);
      if (tokenInHome) return tokenInHome.id;
    }

    const furthestToken = movableTokens.reduce((prev, curr) => 
      curr.position > prev.position ? curr : prev
    );
    return furthestToken.id;
  }, []);

  // Bot turn execution
  const executeBotTurn = useCallback(async () => {
    if (!gameInProgressRef.current || botTurnRef.current) return;
    
    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentTurn];
      if (!currentPlayer?.isBot || prev.phase !== 'playing' || prev.winner) {
        return prev;
      }
      
      botTurnRef.current = true;

      setTimeout(() => {
        setGameState(inner => ({ ...inner, isRolling: true, canRoll: false }));
        
        setTimeout(() => {
          const diceValue = generateDiceValue(true);
          
          setGameState(rollState => {
            const botPlayer = rollState.players[rollState.currentTurn];
            if (!botPlayer?.isBot) {
              botTurnRef.current = false;
              return rollState;
            }

            const tokenId = selectBotMove(botPlayer, diceValue);
            
            if (tokenId !== null) {
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
                    setTimeout(() => executeBotTurn(), 500);
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
                    setTimeout(() => executeBotTurn(), 800);
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
              setTimeout(() => {
                const nextTurn = (rollState.currentTurn + 1) % rollState.players.length;
                const isNextUser = !rollState.players[nextTurn]?.isBot;
                
                botTurnRef.current = false;
                soundManager.playTurnChange();
                
                if (!isNextUser) {
                  setTimeout(() => executeBotTurn(), 800);
                }
                
                setGameState(skipState => ({
                  ...skipState,
                  currentTurn: nextTurn,
                  canRoll: isNextUser,
                  selectedToken: null
                }));
              }, 400);

              return { ...rollState, diceValue, isRolling: false };
            }
          });
        }, 500);
      }, 300);

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
    if (!gameState.canRoll || gameState.isRolling) {
      console.log('[LudoGame Bot] Roll blocked:', { canRoll: gameState.canRoll, isRolling: gameState.isRolling });
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
    
    // Validate user is the current player
    if (user && currentPlayer.id !== user.id) {
      console.error('[LudoGame Bot] User ID mismatch!', { currentPlayerId: currentPlayer.id, userId: user.id });
      return;
    }

    console.log('[LudoGame Bot] User rolling dice');
    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));

    await new Promise(resolve => setTimeout(resolve, 800));

    const diceValue = generateDiceValue(false);
    
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
            selectedToken: null
          }));
          
          if (!isNextUser) {
            setTimeout(() => executeBotTurn(), 800);
          }
        }, 600);
      }

      return { ...prev, diceValue, isRolling: false };
    });
  }, [gameState.canRoll, gameState.isRolling, gameState.players, gameState.currentTurn, user, generateDiceValue, executeBotTurn]);

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
        return {
          ...prev,
          players: updatedPlayers,
          canRoll: true,
          selectedToken: null
        };
      }

      const nextTurn = (prev.currentTurn + 1) % prev.players.length;
      const isNextUser = !prev.players[nextTurn]?.isBot;
      
      soundManager.playTurnChange();
      
      if (!isNextUser) {
        setTimeout(() => executeBotTurn(), 800);
      }

      return {
        ...prev,
        players: updatedPlayers,
        currentTurn: nextTurn,
        canRoll: isNextUser,
        selectedToken: null
      };
    });
  }, [moveToken, executeBotTurn]);

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
    rewardAmount: entryAmount * settings.rewardMultiplier,
    captureEvent,
    clearCaptureEvent,
    // Resume game functionality
    hasActiveGame,
    activeGameData,
    isCheckingActiveGame,
    resumeGame,
    dismissActiveGame
  };
};
