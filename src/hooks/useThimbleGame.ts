import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

export type ThimbleDifficulty = 'easy' | 'hard' | 'impossible';

interface ThimbleSettings {
  isEnabled: boolean;
  minEntryAmount: number;
  platformCommission: number;
  shuffleDurationEasy: number;
  shuffleDurationHard: number;
  shuffleDurationImpossible: number;
  selectionTimeEasy: number;
  selectionTimeHard: number;
  selectionTimeImpossible: number;
  rewardMultiplierEasy: number;
  rewardMultiplierHard: number;
  rewardMultiplierImpossible: number;
}

interface GameState {
  phase: 'idle' | 'mode-select' | 'showing' | 'shuffling' | 'selecting' | 'revealing' | 'result';
  gameId: string | null;
  ballPosition: number;
  selectedCup: number | null;
  isWin: boolean | null;
  cupPositions: number[];
  timeLeft: number;
  entryAmount: number;
}

export const useThimbleGame = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ThimbleSettings>({
    isEnabled: true,
    minEntryAmount: 10,
    platformCommission: 0.1,
    shuffleDurationEasy: 1200,
    shuffleDurationHard: 1200,
    shuffleDurationImpossible: 1200,
    selectionTimeEasy: 10,
    selectionTimeHard: 5,
    selectionTimeImpossible: 2,
    rewardMultiplierEasy: 1.5,
    rewardMultiplierHard: 2,
    rewardMultiplierImpossible: 2,
  });
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<ThimbleDifficulty>('easy');
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    gameId: null,
    ballPosition: 0,
    selectedCup: null,
    isWin: null,
    cupPositions: [0, 1, 2],
    timeLeft: 10,
    entryAmount: 10
  });
  
  const [walletBalance, setWalletBalance] = useState(0);

  // Get settings for current difficulty
  const getDifficultySettings = useCallback((difficulty: ThimbleDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          shuffleDuration: settings.shuffleDurationEasy,
          selectionTime: settings.selectionTimeEasy,
          rewardMultiplier: settings.rewardMultiplierEasy,
        };
      case 'hard':
        return {
          shuffleDuration: settings.shuffleDurationHard,
          selectionTime: settings.selectionTimeHard,
          rewardMultiplier: settings.rewardMultiplierHard,
        };
      case 'impossible':
        return {
          shuffleDuration: settings.shuffleDurationImpossible,
          selectionTime: settings.selectionTimeImpossible,
          rewardMultiplier: settings.rewardMultiplierImpossible,
        };
    }
  }, [settings]);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('thimble_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setSettings({
          isEnabled: data.is_enabled,
          minEntryAmount: Number(data.min_entry_amount),
          platformCommission: Number(data.platform_commission),
          shuffleDurationEasy: data.shuffle_duration_easy,
          shuffleDurationHard: data.shuffle_duration_hard,
          shuffleDurationImpossible: data.shuffle_duration_impossible,
          selectionTimeEasy: data.selection_time_easy,
          selectionTimeHard: data.selection_time_hard,
          selectionTimeImpossible: data.selection_time_impossible,
          rewardMultiplierEasy: data.reward_multiplier_easy ?? 1.5,
          rewardMultiplierHard: data.reward_multiplier_hard ?? 2,
          rewardMultiplierImpossible: data.reward_multiplier_impossible ?? 3,
        });
        
        setGameState(prev => ({ 
          ...prev, 
          entryAmount: Number(data.min_entry_amount),
          timeLeft: data.selection_time_easy
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

  const proceedToModeSelect = useCallback(() => {
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

    setGameState(prev => ({ ...prev, phase: 'mode-select' }));
  }, [user, gameState.entryAmount, settings.minEntryAmount, walletBalance, toast]);

  const startGame = useCallback(async () => {
    if (!user) {
      toast({ title: 'Please login to play', variant: 'destructive' });
      return;
    }

    const diffSettings = getDifficultySettings(selectedDifficulty);
    const entryAmount = gameState.entryAmount;

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

    // Random ball position (0, 1, or 2)
    const ballPosition = Math.floor(Math.random() * 3);
    const rewardAmount = Math.floor(entryAmount * diffSettings.rewardMultiplier);

    // Create game record
    const { data: game, error: gameError } = await supabase
      .from('thimble_games')
      .insert({
        user_id: user.id,
        entry_amount: entryAmount,
        reward_amount: rewardAmount,
        ball_position: ballPosition,
        difficulty: selectedDifficulty,
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
      phase: 'showing',
      gameId: game.id,
      ballPosition,
      selectedCup: null,
      isWin: null,
      cupPositions: [0, 1, 2],
      timeLeft: diffSettings.selectionTime
    }));

    // Show ball for 2 seconds, then shuffle
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'shuffling' }));
      
      // After shuffle complete, start selection phase
      setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: 'selecting' }));
      }, diffSettings.shuffleDuration);
    }, 2000);
  }, [user, walletBalance, selectedDifficulty, gameState.entryAmount, getDifficultySettings, toast]);

  // Selection timer
  useEffect(() => {
    if (gameState.phase !== 'selecting') return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          // Time's up - auto lose
          handleSelection(-1);
          return prev;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.phase]);

  const handleSelection = useCallback(async (cupIndex: number) => {
    if (gameState.phase !== 'selecting' || !gameState.gameId) return;

    const isWin = cupIndex === gameState.ballPosition;
    
    // First go to revealing phase to show all cups lifted
    setGameState(prev => ({
      ...prev,
      phase: 'revealing',
      selectedCup: cupIndex,
      isWin
    }));

    if (isWin) {
      soundManager.playTokenHome();
      hapticManager.tokenHome();
    } else {
      hapticManager.tokenMove();
    }

    // After 2 seconds of reveal, show the result modal
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        phase: 'result'
      }));
    }, 2000);

    if (isWin) {
      soundManager.playTokenHome();
      hapticManager.tokenHome();
    } else {
      hapticManager.tokenMove();
    }

    // Update game record
    await supabase
      .from('thimble_games')
      .update({
        selected_position: cupIndex,
        is_win: isWin,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', gameState.gameId);

    if (isWin && user) {
      const diffSettings = getDifficultySettings(selectedDifficulty);
      const rewardAmount = Math.floor(gameState.entryAmount * diffSettings.rewardMultiplier);
      
      // Credit reward
      await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance + rewardAmount })
        .eq('id', user.id);

      setWalletBalance(prev => prev + rewardAmount);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🎉 Thimble Victory!',
        message: `You won ₹${rewardAmount} in Thimble Game!`,
        type: 'success'
      });

      toast({
        title: '🎉 You Won!',
        description: `₹${rewardAmount} added to your wallet!`
      });
    } else {
      toast({
        title: '😔 Wrong Cup!',
        description: `Better luck next time!`,
        variant: 'destructive'
      });
    }
  }, [gameState, user, selectedDifficulty, walletBalance, getDifficultySettings, toast]);

  const resetGame = useCallback(() => {
    const diffSettings = getDifficultySettings(selectedDifficulty);
    setGameState({
      phase: 'idle',
      gameId: null,
      ballPosition: 0,
      selectedCup: null,
      isWin: null,
      cupPositions: [0, 1, 2],
      timeLeft: diffSettings.selectionTime,
      entryAmount: settings.minEntryAmount
    });
  }, [settings, selectedDifficulty, getDifficultySettings]);

  const setEntryAmount = useCallback((amount: number) => {
    setGameState(prev => ({ ...prev, entryAmount: amount }));
  }, []);

  const rewardAmount = gameState.entryAmount * getDifficultySettings(selectedDifficulty).rewardMultiplier;

  return {
    settings,
    gameState,
    walletBalance,
    selectedDifficulty,
    setSelectedDifficulty,
    proceedToModeSelect,
    startGame,
    handleSelection,
    resetGame,
    setEntryAmount,
    rewardAmount,
    getDifficultySettings
  };
};