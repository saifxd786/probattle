import { useState, useEffect, useCallback, useRef } from 'react';
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
  ballPosition: number; // Only set after game ends
  selectedCup: number | null;
  isWin: boolean | null;
  cupPositions: number[];
  timeLeft: number;
  entryAmount: number;
  rewardAmount: number;
}

export const useSecureThimbleGame = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    ballPosition: -1, // Unknown until game ends
    selectedCup: null,
    isWin: null,
    cupPositions: [0, 1, 2],
    timeLeft: 10,
    entryAmount: 10,
    rewardAmount: 0
  });
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
        const unifiedShuffleDuration = Math.min(
          Number(data.shuffle_duration_easy ?? 1200),
          Number(data.shuffle_duration_hard ?? 1200),
          Number(data.shuffle_duration_impossible ?? 1200)
        );

        setSettings({
          isEnabled: data.is_enabled,
          minEntryAmount: Number(data.min_entry_amount),
          platformCommission: Number(data.platform_commission),
          shuffleDurationEasy: unifiedShuffleDuration,
          shuffleDurationHard: unifiedShuffleDuration,
          shuffleDurationImpossible: unifiedShuffleDuration,
          selectionTimeEasy: data.selection_time_easy,
          selectionTimeHard: data.selection_time_hard,
          selectionTimeImpossible: data.selection_time_impossible,
          rewardMultiplierEasy: data.reward_multiplier_easy ?? 1.5,
          rewardMultiplierHard: data.reward_multiplier_hard ?? 2,
          rewardMultiplierImpossible: data.reward_multiplier_impossible ?? 2,
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
    if (!user || !session) {
      toast({ title: 'Please login to play', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const diffSettings = getDifficultySettings(selectedDifficulty);

    try {
      const { data, error } = await supabase.functions.invoke('thimble-game-server', {
        body: {
          action: 'start',
          entryAmount: gameState.entryAmount,
          difficulty: selectedDifficulty
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to start game');
      }

      setWalletBalance(prev => prev - gameState.entryAmount);

      setGameState(prev => ({
        ...prev,
        phase: 'showing',
        gameId: data.game.id,
        ballPosition: -1, // NEVER set from server during game - this is the security fix
        selectedCup: null,
        isWin: null,
        rewardAmount: data.game.rewardAmount,
        cupPositions: [0, 1, 2],
        timeLeft: diffSettings.selectionTime
      }));

      // Show a random "fake" ball position for animation purposes
      // The real position is only known to the server
      const fakeBallPosition = Math.floor(Math.random() * 3);

      // After showing phase, shuffle
      setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: 'shuffling', ballPosition: fakeBallPosition }));
        
        // After shuffle, start selection
        setTimeout(() => {
          setGameState(prev => ({ ...prev, phase: 'selecting' }));
          
          // Start countdown timer
          timerRef.current = setInterval(() => {
            setGameState(prev => {
              if (prev.timeLeft <= 1) {
                if (timerRef.current) clearInterval(timerRef.current);
                // Time's up - auto-select nothing (loss)
                handleSelection(-1);
                return prev;
              }
              return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
          }, 1000);
        }, diffSettings.shuffleDuration);
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, session, selectedDifficulty, gameState.entryAmount, getDifficultySettings, toast]);

  const handleSelection = useCallback(async (cupIndex: number) => {
    if (gameState.phase !== 'selecting' || !gameState.gameId || isLoading) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('thimble-game-server', {
        body: {
          action: 'select',
          gameId: gameState.gameId,
          selectedPosition: cupIndex
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit selection');
      }

      // Now we get the real ball position from server
      setGameState(prev => ({
        ...prev,
        phase: 'revealing',
        selectedCup: cupIndex,
        ballPosition: data.ballPosition, // Real position revealed
        isWin: data.isWin
      }));

      if (data.isWin) {
        soundManager.playTokenHome();
        hapticManager.tokenHome();
        setWalletBalance(prev => prev + data.rewardAmount);
      } else {
        hapticManager.tokenMove();
      }

      // After reveal, show result
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          phase: 'result'
        }));

        if (data.isWin) {
          toast({
            title: '🎉 You Won!',
            description: `₹${data.rewardAmount} added to your wallet!`
          });
        } else {
          toast({
            title: '😔 Wrong Cup!',
            description: 'Better luck next time!',
            variant: 'destructive'
          });
        }
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit selection';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [gameState, isLoading, toast]);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const diffSettings = getDifficultySettings(selectedDifficulty);
    setGameState({
      phase: 'idle',
      gameId: null,
      ballPosition: -1,
      selectedCup: null,
      isWin: null,
      cupPositions: [0, 1, 2],
      timeLeft: diffSettings.selectionTime,
      entryAmount: settings.minEntryAmount,
      rewardAmount: 0
    });
  }, [settings, selectedDifficulty, getDifficultySettings]);

  const setEntryAmount = useCallback((amount: number) => {
    setGameState(prev => ({ ...prev, entryAmount: amount }));
  }, []);

  const setCupPositions = useCallback((positions: number[]) => {
    setGameState(prev => ({ ...prev, cupPositions: positions }));
  }, []);

  const rewardAmount = gameState.entryAmount * getDifficultySettings(selectedDifficulty).rewardMultiplier;

  return {
    settings,
    gameState,
    walletBalance,
    selectedDifficulty,
    isLoading,
    setSelectedDifficulty,
    proceedToModeSelect,
    startGame,
    handleSelection,
    resetGame,
    setEntryAmount,
    setCupPositions,
    rewardAmount,
    getDifficultySettings
  };
};
