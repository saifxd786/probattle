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
  // Designed to favor the house with aggressive difficulty scaling
  const calculateMultiplier = useCallback((minesCount: number, revealedCount: number) => {
    if (revealedCount === 0) return 1;
    
    const totalTiles = 25;
    const safeTiles = totalTiles - minesCount;
    
    // Difficulty modifiers
    // Easy: Normal luck - bombs appear randomly
    // Medium: Bomb likely after 2-4 safe boxes  
    // Hard: Bomb likely after 1-2 safe boxes
    const difficultyModifier: Record<string, number> = {
      easy: 0.80,    // Normal randomness
      medium: 0.65,  // Bombs more frequent after 2-4 reveals
      hard: 0.50     // Bombs very frequent after 1-2 reveals
    };
    
    // Calculate true probability-based multiplier
    let probabilityMultiplier = 1;
    for (let i = 0; i < revealedCount; i++) {
      const remainingSafe = safeTiles - i;
      const remainingTiles = totalTiles - i;
      // Probability of next tile being safe
      const probSafe = remainingSafe / remainingTiles;
      probabilityMultiplier *= (1 / probSafe);
    }
    
    // Apply house edge (platform commission) and difficulty modifier
    const houseEdge = 1 - settings.platformCommission;
    const diffMod = difficultyModifier[settings.difficulty] || 0.65;
    
    // Final multiplier with aggressive house advantage
    const finalMultiplier = probabilityMultiplier * houseEdge * diffMod;
    
    // Ensure minimum multiplier of 1.01 to give player something
    return Math.max(1.01, Math.round(finalMultiplier * 100) / 100);
  }, [settings]);

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

  // Generate random mine positions
  const generateMinePositions = useCallback((count: number): number[] => {
    const positions: number[] = [];
    while (positions.length < count) {
      const pos = Math.floor(Math.random() * 25);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }
    return positions;
  }, []);

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
