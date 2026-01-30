import { useState, useEffect, useCallback } from 'react';
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
    currentMultiplier: 1,
    potentialWin: 0,
    isWin: null,
    finalAmount: 0
  });
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mines-game-server', {
        body: {
          action: 'start',
          entryAmount: gameState.entryAmount,
          minesCount: gameState.minesCount
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to start game');
      }

      setWalletBalance(prev => prev - gameState.entryAmount);

      setGameState(prev => ({
        ...prev,
        phase: 'playing',
        gameId: data.game.id,
        minePositions: [], // NEVER set from server response during game
        revealedPositions: data.game.revealedPositions || [],
        currentMultiplier: data.game.currentMultiplier || 1,
        potentialWin: data.game.potentialWin || prev.entryAmount,
        isWin: null,
        finalAmount: 0
      }));

      hapticManager.tokenEnter();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, session, walletBalance, gameState.entryAmount, gameState.minesCount, settings, toast]);

  const revealTile = useCallback(async (position: number) => {
    if (gameState.phase !== 'playing' || !gameState.gameId || isLoading) return;
    if (gameState.revealedPositions.includes(position)) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mines-game-server', {
        body: {
          action: 'reveal',
          gameId: gameState.gameId,
          position
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to reveal tile');
      }

      if (data.isMine) {
        // Hit a mine - game over
        soundManager.playBombExplosion();
        hapticManager.tokenHome();
        
        setGameState(prev => ({
          ...prev,
          phase: 'result',
          revealedPositions: data.revealedPositions,
          minePositions: data.minePositions, // Now we can see mines
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
          currentMultiplier: data.currentMultiplier,
          potentialWin: data.potentialWin
        }));

        if (data.allSafeRevealed) {
          // Auto-cashout
          setGameState(prev => ({
            ...prev,
            phase: 'result',
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
      setIsLoading(false);
    }
  }, [gameState, isLoading, toast]);

  const cashOut = useCallback(async () => {
    if (gameState.phase !== 'playing' || !gameState.gameId || gameState.revealedPositions.length === 0) {
      toast({ title: 'No gems revealed yet!', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mines-game-server', {
        body: {
          action: 'cashout',
          gameId: gameState.gameId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to cash out');
      }

      soundManager.playCashOut();
      hapticManager.tokenHome();

      setGameState(prev => ({
        ...prev,
        phase: 'result',
        isWin: true,
        finalAmount: data.finalAmount,
        minePositions: data.minePositions // Now we can see mines
      }));

      setWalletBalance(prev => prev + data.finalAmount);

      toast({
        title: '💎 Cashed Out!',
        description: `₹${data.finalAmount} added to your wallet!`
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to cash out';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [gameState, toast]);

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'idle',
      gameId: null,
      minePositions: [],
      revealedPositions: [],
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
