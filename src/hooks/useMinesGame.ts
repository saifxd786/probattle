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
  minePositions: number[];
  revealedPositions: number[];
  currentMultiplier: number;
  potentialWin: number;
  isWin: boolean | null;
  finalAmount: number;
}

export const useMinesGame = () => {
  const { user } = useAuth();
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

  // Calculate multiplier based on mines and revealed gems
  // Standard Mines probability-based multiplier (like Stake.com)
  const calculateMultiplier = useCallback((minesCount: number, revealedCount: number) => {
    if (revealedCount === 0) return 1;
    
    const totalTiles = 25;
    const safeTiles = totalTiles - minesCount;
    
    // Standard probability-based multiplier calculation
    // For each reveal, multiply by (total remaining / safe remaining)
    // This gives the true odds of successfully picking safe tiles
    let multiplier = 1;
    for (let i = 0; i < revealedCount; i++) {
      const remainingTiles = totalTiles - i;
      const remainingSafe = safeTiles - i;
      // Each successful pick multiplies by 1/probability
      multiplier *= (remainingTiles / remainingSafe);
    }
    
    // Apply only platform commission (house edge)
    // Difficulty only affects bomb placement randomness (handled elsewhere), not the payout
    const houseEdge = 1 - settings.platformCommission;
    const finalMultiplier = multiplier * houseEdge;
    
    // Round to 2 decimal places
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

  // Generate mine positions with difficulty-based weighting
  // Difficulty affects bomb placement probability near revealed tiles
  const generateMinePositions = useCallback((count: number, revealedPositions: number[] = []): number[] => {
    const positions: number[] = [];
    const totalTiles = 25;
    
    // Get adjacent positions for a given tile
    const getAdjacentPositions = (pos: number): number[] => {
      const adjacent: number[] = [];
      const row = Math.floor(pos / 5);
      const col = pos % 5;
      
      // Check all 8 directions
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, -1], [1, 0], [1, 1]
      ];
      
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
          adjacent.push(newRow * 5 + newCol);
        }
      }
      return adjacent;
    };
    
    // Calculate weighted probabilities based on difficulty
    const calculateWeights = (): number[] => {
      const weights = new Array(totalTiles).fill(1);
      
      if (revealedPositions.length === 0 || settings.difficulty === 'easy') {
        // Easy mode: completely random placement
        return weights;
      }
      
      // Get all adjacent positions to revealed tiles
      const adjacentToRevealed = new Set<number>();
      revealedPositions.forEach(pos => {
        getAdjacentPositions(pos).forEach(adj => {
          if (!revealedPositions.includes(adj)) {
            adjacentToRevealed.add(adj);
          }
        });
      });
      
      // Apply difficulty-based weighting
      // Higher weight = more likely to place a mine there
      if (settings.difficulty === 'medium') {
        // Medium: slight bias towards tiles adjacent to revealed ones
        adjacentToRevealed.forEach(pos => {
          weights[pos] = 1.5;
        });
      } else if (settings.difficulty === 'hard') {
        // Hard: strong bias towards tiles adjacent to revealed ones
        adjacentToRevealed.forEach(pos => {
          weights[pos] = 2.5;
        });
        // Also increase weight for tiles 2 steps away
        revealedPositions.forEach(revealed => {
          getAdjacentPositions(revealed).forEach(adj => {
            getAdjacentPositions(adj).forEach(secondAdj => {
              if (!revealedPositions.includes(secondAdj) && !adjacentToRevealed.has(secondAdj)) {
                weights[secondAdj] = Math.max(weights[secondAdj], 1.8);
              }
            });
          });
        });
      }
      
      // Remove revealed positions from consideration
      revealedPositions.forEach(pos => {
        weights[pos] = 0;
      });
      
      return weights;
    };
    
    // Weighted random selection
    const selectWeightedRandom = (weights: number[], excluded: number[]): number => {
      const availableWeights = weights.map((w, i) => excluded.includes(i) ? 0 : w);
      const totalWeight = availableWeights.reduce((sum, w) => sum + w, 0);
      
      if (totalWeight === 0) {
        // Fallback to uniform random if no weights available
        const available = Array.from({ length: totalTiles }, (_, i) => i)
          .filter(i => !excluded.includes(i));
        return available[Math.floor(Math.random() * available.length)];
      }
      
      let random = Math.random() * totalWeight;
      for (let i = 0; i < totalTiles; i++) {
        random -= availableWeights[i];
        if (random <= 0) return i;
      }
      
      // Fallback
      return Math.floor(Math.random() * totalTiles);
    };
    
    const weights = calculateWeights();
    
    while (positions.length < count) {
      const pos = selectWeightedRandom(weights, positions);
      if (!positions.includes(pos) && !revealedPositions.includes(pos)) {
        positions.push(pos);
      }
    }
    
    return positions;
  }, [settings.difficulty]);

  const startGame = useCallback(async () => {
    if (!user) {
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

    if (gameState.minesCount < settings.minMines || gameState.minesCount > settings.maxMines) {
      toast({ title: `Mines must be between ${settings.minMines} and ${settings.maxMines}`, variant: 'destructive' });
      return;
    }

    // Deduct entry from wallet
    const { error: deductError } = await supabase
      .from('profiles')
      .update({ wallet_balance: walletBalance - gameState.entryAmount })
      .eq('id', user.id);

    if (deductError) {
      toast({ title: 'Failed to deduct entry fee', variant: 'destructive' });
      return;
    }

    setWalletBalance(prev => prev - gameState.entryAmount);

    // Generate mine positions
    const minePositions = generateMinePositions(gameState.minesCount);

    // Create game record
    const { data: game, error: gameError } = await supabase
      .from('mines_games')
      .insert({
        user_id: user.id,
        entry_amount: gameState.entryAmount,
        mines_count: gameState.minesCount,
        mine_positions: minePositions,
        revealed_positions: [],
        current_multiplier: 1,
        potential_win: gameState.entryAmount,
        status: 'in_progress'
      })
      .select()
      .single();

    if (gameError || !game) {
      toast({ title: 'Failed to start game', variant: 'destructive' });
      await supabase.from('profiles').update({ wallet_balance: walletBalance }).eq('id', user.id);
      return;
    }

    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      gameId: game.id,
      minePositions,
      revealedPositions: [],
      currentMultiplier: 1,
      potentialWin: prev.entryAmount,
      isWin: null,
      finalAmount: 0
    }));

    hapticManager.tokenEnter();
  }, [user, walletBalance, gameState.entryAmount, gameState.minesCount, settings, generateMinePositions, toast]);

  const revealTile = useCallback(async (position: number) => {
    if (gameState.phase !== 'playing' || !gameState.gameId) return;
    if (gameState.revealedPositions.includes(position)) return;

    const isMine = gameState.minePositions.includes(position);
    
    if (isMine) {
      // Hit a mine - game over
      soundManager.playBombExplosion();
      hapticManager.tokenHome();
      
      setGameState(prev => ({
        ...prev,
        phase: 'result',
        revealedPositions: [...prev.revealedPositions, position],
        isWin: false,
        finalAmount: 0
      }));

      // Update game record
      await supabase
        .from('mines_games')
        .update({
          revealed_positions: [...gameState.revealedPositions, position],
          is_mine_hit: true,
          status: 'lost',
          final_amount: 0,
          completed_at: new Date().toISOString()
        })
        .eq('id', gameState.gameId);

      toast({
        title: '💥 BOOM!',
        description: 'You hit a mine! Better luck next time.',
        variant: 'destructive'
      });
    } else {
      // Safe tile - gem found
      soundManager.playGemReveal();
      hapticManager.tokenMove();
      
      const newRevealed = [...gameState.revealedPositions, position];
      const newMultiplier = calculateMultiplier(gameState.minesCount, newRevealed.length);
      const newPotentialWin = Math.floor(gameState.entryAmount * newMultiplier);

      setGameState(prev => ({
        ...prev,
        revealedPositions: newRevealed,
        currentMultiplier: newMultiplier,
        potentialWin: newPotentialWin
      }));

      // Update game record
      await supabase
        .from('mines_games')
        .update({
          revealed_positions: newRevealed,
          current_multiplier: newMultiplier,
          potential_win: newPotentialWin
        })
        .eq('id', gameState.gameId);

      // Check if all safe tiles revealed (auto cashout)
      if (newRevealed.length === 25 - gameState.minesCount) {
        await cashOut();
      }
    }
  }, [gameState, calculateMultiplier, toast]);

  const cashOut = useCallback(async () => {
    if (gameState.phase !== 'playing' || !gameState.gameId || gameState.revealedPositions.length === 0) {
      toast({ title: 'No gems revealed yet!', variant: 'destructive' });
      return;
    }

    const winAmount = gameState.potentialWin;
    
    soundManager.playCashOut();
    hapticManager.tokenHome();

    setGameState(prev => ({
      ...prev,
      phase: 'result',
      isWin: true,
      finalAmount: winAmount
    }));

    // Update game record
    await supabase
      .from('mines_games')
      .update({
        is_cashed_out: true,
        status: 'won',
        final_amount: winAmount,
        completed_at: new Date().toISOString()
      })
      .eq('id', gameState.gameId);

    // Credit winnings to wallet
    if (user) {
      await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance + winAmount })
        .eq('id', user.id);

      setWalletBalance(prev => prev + winAmount);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '💎 Mines Victory!',
        message: `You won ₹${winAmount} in Mines!`,
        type: 'success'
      });
    }

    toast({
      title: '💎 Cashed Out!',
      description: `₹${winAmount} added to your wallet!`
    });
  }, [gameState, user, walletBalance, toast]);

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
    startGame,
    revealTile,
    cashOut,
    resetGame,
    setEntryAmount,
    setMinesCount,
    calculateMultiplier
  };
};
