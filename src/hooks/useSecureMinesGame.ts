import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

interface MinesSettings {
  isEnabled: boolean;
  minEntryAmount: number;
  platformCommission: number;
  gridSize: number;
  minMines: number;
  maxMines: number;
  baseMultiplier: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GameState {
  phase: 'idle' | 'playing' | 'result';
  gameId: string | null;
  entryAmount: number;
  minesCount: number;
  minePositions: number[]; // Only populated after game ends
  revealedPositions: number[];
  pendingPositions: number[]; // Optimistic UI - tapped but not confirmed
  currentMultiplier: number;
  potentialWin: number;
  isWin: boolean | null;
  finalAmount: number;
}

export const useSecureMinesGame = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<MinesSettings>({
    isEnabled: true,
    minEntryAmount: 10,
    platformCommission: 0.1,
    gridSize: 25,
    minMines: 1,
    maxMines: 24,
    baseMultiplier: 1.03,
    difficulty: 'medium'
  });
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    gameId: null,
    entryAmount: 10,
    minesCount: 3,
    minePositions: [],
    revealedPositions: [],
    pendingPositions: [],
    currentMultiplier: 1,
    potentialWin: 0,
    isWin: null,
    finalAmount: 0
  });
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Queue for rapid taps - process in order
  const pendingRevealsRef = useRef<Set<number>>(new Set());
  const processingRef = useRef(false);

  // Calculate multiplier for display purposes
  const calculateMultiplier = useCallback((minesCount: number, revealedCount: number) => {
    if (revealedCount === 0) return 1;
    
    const totalTiles = 25;
    const safeTiles = totalTiles - minesCount;
    
    let multiplier = 1;
    for (let i = 0; i < revealedCount; i++) {
      const remainingTiles = totalTiles - i;
      const remainingSafe = safeTiles - i;
      multiplier *= (remainingTiles / remainingSafe);
    }
    
    const houseEdge = 1 - settings.platformCommission;
    const finalMultiplier = multiplier * houseEdge;
    
    return Math.max(1.01, Math.round(finalMultiplier * 100) / 100);
  }, [settings.platformCommission]);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('mines_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setSettings({
          isEnabled: data.is_enabled,
          minEntryAmount: Number(data.min_entry_amount),
          platformCommission: Number(data.platform_commission),
          gridSize: data.grid_size,
          minMines: data.min_mines,
          maxMines: data.max_mines,
          baseMultiplier: Number(data.base_multiplier),
          difficulty: data.difficulty as MinesSettings['difficulty']
        });
        
        setGameState(prev => ({ 
          ...prev, 
          entryAmount: Number(data.min_entry_amount)
        }));
      }
    };
    
    fetchSettings();
  }, []);

  // Fetch wallet balance
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

  // Process reveal queue - defined first so it can be used by startGame
  const processRevealQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (pendingRevealsRef.current.size === 0) return;
    
    processingRef.current = true;
    
    // Get next position from queue
    const position = pendingRevealsRef.current.values().next().value;
    if (position === undefined) {
      processingRef.current = false;
      return;
    }
    pendingRevealsRef.current.delete(position);
    
    try {
      const currentGameId = gameState.gameId;
      // Wait for real gameId (not 'pending')
      if (!currentGameId || currentGameId === 'pending' || gameState.phase !== 'playing') {
        processingRef.current = false;
        return;
      }

      const { data, error } = await supabase.functions.invoke('mines-game-server', {
        body: {
          action: 'reveal',
          gameId: currentGameId,
          position
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to reveal tile');
      }

      if (data.isMine) {
        // Hit a mine - game over, clear queue
        pendingRevealsRef.current.clear();
        soundManager.playBombExplosion();
        hapticManager.tokenHome();
        
        setGameState(prev => ({
          ...prev,
          phase: 'result',
          revealedPositions: data.revealedPositions,
          pendingPositions: [],
          minePositions: data.minePositions,
          isWin: false,
          finalAmount: 0
        }));

        toast({
          title: '💥 BOOM!',
          description: 'You hit a mine! Better luck next time.',
          variant: 'destructive'
        });
      } else {
        // Safe tile
        soundManager.playGemReveal();
        hapticManager.tokenMove();
        
        setGameState(prev => ({
          ...prev,
          revealedPositions: data.revealedPositions,
          pendingPositions: prev.pendingPositions.filter(p => !data.revealedPositions.includes(p)),
          currentMultiplier: data.currentMultiplier,
          potentialWin: data.potentialWin
        }));

        if (data.allSafeRevealed) {
          pendingRevealsRef.current.clear();
          setGameState(prev => ({
            ...prev,
            phase: 'result',
            pendingPositions: [],
            isWin: true,
            finalAmount: data.potentialWin
          }));
          setWalletBalance(prev => prev + data.potentialWin);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reveal tile';
      toast({ title: message, variant: 'destructive' });
    } finally {
      processingRef.current = false;
      // Process next in queue
      if (pendingRevealsRef.current.size > 0 && gameState.phase === 'playing') {
        processRevealQueue();
      }
    }
  }, [gameState.gameId, gameState.phase, toast]);

  const startGame = useCallback(async () => {
    if (!user || !session) {
      toast({ title: 'Please login to play', variant: 'destructive' });
      return;
    }

    if (gameState.entryAmount < settings.minEntryAmount) {
      toast({ title: `Minimum entry is ₹${settings.minEntryAmount}`, variant: 'destructive' });
      return;
    }

    if (walletBalance < gameState.entryAmount) {
      toast({ title: 'Insufficient balance', description: 'Please add funds to your wallet', variant: 'destructive' });
      return;
    }

    // INSTANT: Update UI immediately before server call
    const entryAmount = gameState.entryAmount;
    const minesCount = gameState.minesCount;
    
    setWalletBalance(prev => prev - entryAmount);
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      gameId: 'pending',
      minePositions: [],
      revealedPositions: [],
      pendingPositions: [],
      currentMultiplier: 1,
      potentialWin: entryAmount,
      isWin: null,
      finalAmount: 0
    }));
    
    hapticManager.tokenEnter();

    // Server call in background
    try {
      console.log('[Mines] Starting game request...');
      const { data, error } = await supabase.functions.invoke('mines-game-server', {
        body: {
          action: 'start',
          entryAmount,
          minesCount
        }
      });

      console.log('[Mines] Server response:', data, error);

      if (error) {
        console.error('[Mines] Function error:', error);
        throw new Error(error.message || 'Server error');
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to start game';
        console.error('[Mines] Game start failed:', errorMsg);
        throw new Error(errorMsg);
      }

      // Update with real game ID and process any queued clicks
      setGameState(prev => ({
        ...prev,
        gameId: data.game.id,
        revealedPositions: data.game.revealedPositions || [],
        currentMultiplier: data.game.currentMultiplier || 1,
        potentialWin: data.game.potentialWin || entryAmount
      }));
      
      console.log('[Mines] Game started successfully:', data.game.id);
      
      // Process any pending reveals that were queued during 'pending' state
      setTimeout(() => {
        if (pendingRevealsRef.current.size > 0) {
          processRevealQueue();
        }
      }, 0);
    } catch (error: unknown) {
      // Rollback on error
      setWalletBalance(prev => prev + entryAmount);
      setGameState(prev => ({
        ...prev,
        phase: 'idle',
        gameId: null,
        pendingPositions: []
      }));
      pendingRevealsRef.current.clear();
      const message = error instanceof Error ? error.message : 'Failed to start game';
      console.error('[Mines] Start game error:', message);
      toast({ title: message, variant: 'destructive' });
    }
  }, [user, session, walletBalance, gameState.entryAmount, gameState.minesCount, settings, toast, processRevealQueue]);

  const revealTile = useCallback((position: number) => {
    if (gameState.phase !== 'playing') return;
    // Check both confirmed AND pending positions
    if (gameState.revealedPositions.includes(position)) return;
    if (gameState.pendingPositions.includes(position)) return;
    if (pendingRevealsRef.current.has(position)) return;
    // Limit max pending tiles
    if (pendingRevealsRef.current.size >= 5) return;
    
    // INSTANT: Add to pending queue and show gem immediately
    pendingRevealsRef.current.add(position);
    setGameState(prev => ({
      ...prev,
      pendingPositions: [...prev.pendingPositions, position]
    }));
    
    // Instant haptic feedback
    hapticManager.tokenMove();
    
    // Process queue only if we have real gameId
    if (gameState.gameId && gameState.gameId !== 'pending') {
      processRevealQueue();
    }
  }, [gameState.phase, gameState.gameId, gameState.revealedPositions, gameState.pendingPositions, processRevealQueue]);

  const cashOut = useCallback(async () => {
    // Wait for real gameId (not 'pending')
    if (gameState.phase !== 'playing' || !gameState.gameId || gameState.gameId === 'pending' || gameState.revealedPositions.length === 0) {
      toast({ title: 'No gems revealed yet!', variant: 'destructive' });
      return;
    }

    // INSTANT: Optimistic UI update
    const expectedWin = gameState.potentialWin;
    const currentGameId = gameState.gameId;
    
    // Clear pending queue
    pendingRevealsRef.current.clear();
    
    // Immediately show result
    soundManager.playCashOut();
    hapticManager.tokenHome();
    
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      pendingPositions: [],
      isWin: true,
      finalAmount: expectedWin
    }));
    
    setWalletBalance(prev => prev + expectedWin);

    // Server call in background
    try {
      const { data, error } = await supabase.functions.invoke('mines-game-server', {
        body: {
          action: 'cashout',
          gameId: currentGameId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to cash out');
      }

      // Update with actual server values (mine positions for reveal)
      setGameState(prev => ({
        ...prev,
        finalAmount: data.finalAmount,
        minePositions: data.minePositions
      }));
      
      // Correct balance if server amount differs
      if (data.finalAmount !== expectedWin) {
        setWalletBalance(prev => prev - expectedWin + data.finalAmount);
      }

      toast({
        title: '💎 Cashed Out!',
        description: `₹${data.finalAmount} added to your wallet!`
      });
    } catch (error: unknown) {
      // Rollback on error
      setWalletBalance(prev => prev - expectedWin);
      setGameState(prev => ({
        ...prev,
        phase: 'playing',
        isWin: null,
        finalAmount: 0
      }));
      const message = error instanceof Error ? error.message : 'Failed to cash out';
      toast({ title: message, variant: 'destructive' });
    }
  }, [gameState, toast]);

  const resetGame = useCallback(() => {
    pendingRevealsRef.current.clear();
    setGameState(prev => ({
      ...prev,
      phase: 'idle',
      gameId: null,
      minePositions: [],
      revealedPositions: [],
      pendingPositions: [],
      currentMultiplier: 1,
      potentialWin: prev.entryAmount,
      isWin: null,
      finalAmount: 0
    }));
  }, []);

  const setEntryAmount = useCallback((amount: number) => {
    setGameState(prev => ({ ...prev, entryAmount: amount, potentialWin: amount }));
  }, []);

  const setMinesCount = useCallback((count: number) => {
    setGameState(prev => ({ ...prev, minesCount: count }));
  }, []);

  return {
    settings,
    gameState,
    walletBalance,
    isLoading,
    startGame,
    revealTile,
    cashOut,
    resetGame,
    setEntryAmount,
    setMinesCount,
    calculateMultiplier
  };
};
