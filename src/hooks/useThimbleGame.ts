import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/utils/soundManager';
import { hapticManager } from '@/utils/hapticManager';

interface ThimbleSettings {
  isEnabled: boolean;
  difficulty: 'easy' | 'hard' | 'impossible';
  minEntryAmount: number;
  rewardMultiplier: number;
  platformCommission: number;
  shuffleDuration: number;
  selectionTime: number;
}

interface GameState {
  phase: 'idle' | 'betting' | 'showing' | 'shuffling' | 'selecting' | 'result';
  gameId: string | null;
  ballPosition: number;
  selectedCup: number | null;
  isWin: boolean | null;
  cupPositions: number[];
  timeLeft: number;
  entryAmount: number;
}

const INDIAN_OPPONENT_NAMES = [
  'Arjun_Pro', 'Priya_Queen', 'Rahul_King', 'Ananya_Star', 'Vikram_Beast',
  'Sneha_Fire', 'Karan_Master', 'Pooja_Devi', 'Aditya_Champ', 'Neha_Queen',
  'Rohan_Tiger', 'Sakshi_Pro', 'Amit_Warrior', 'Divya_Star', 'Raj_Legend'
];

export const useThimbleGame = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ThimbleSettings>({
    isEnabled: true,
    difficulty: 'easy',
    minEntryAmount: 100,
    rewardMultiplier: 1.5,
    platformCommission: 0.1,
    shuffleDuration: 3000,
    selectionTime: 10
  });
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'idle',
    gameId: null,
    ballPosition: 0,
    selectedCup: null,
    isWin: null,
    cupPositions: [0, 1, 2],
    timeLeft: 10,
    entryAmount: 100
  });
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [opponentName, setOpponentName] = useState('');

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('thimble_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        const difficulty = data.difficulty as 'easy' | 'hard' | 'impossible';
        const shuffleDurations = {
          easy: data.shuffle_duration_easy,
          hard: data.shuffle_duration_hard,
          impossible: data.shuffle_duration_impossible
        };
        const selectionTimes = {
          easy: data.selection_time_easy,
          hard: data.selection_time_hard,
          impossible: data.selection_time_impossible
        };
        
        setSettings({
          isEnabled: data.is_enabled,
          difficulty,
          minEntryAmount: Number(data.min_entry_amount),
          rewardMultiplier: Number(data.reward_multiplier),
          platformCommission: Number(data.platform_commission),
          shuffleDuration: shuffleDurations[difficulty],
          selectionTime: selectionTimes[difficulty]
        });
        
        setGameState(prev => ({ 
          ...prev, 
          entryAmount: Number(data.min_entry_amount),
          timeLeft: selectionTimes[difficulty]
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

  const getRandomOpponent = useCallback(() => {
    return INDIAN_OPPONENT_NAMES[Math.floor(Math.random() * INDIAN_OPPONENT_NAMES.length)];
  }, []);

  const startGame = useCallback(async (entryAmount: number) => {
    if (!user) {
      toast({ title: 'Please login to play', variant: 'destructive' });
      return;
    }

    if (entryAmount < settings.minEntryAmount) {
      toast({ title: `Minimum entry is ₹${settings.minEntryAmount}`, variant: 'destructive' });
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

    // Random ball position (0, 1, or 2)
    const ballPosition = Math.floor(Math.random() * 3);
    const rewardAmount = entryAmount * settings.rewardMultiplier;

    // Create game record
    const { data: game, error: gameError } = await supabase
      .from('thimble_games')
      .insert({
        user_id: user.id,
        entry_amount: entryAmount,
        reward_amount: rewardAmount,
        ball_position: ballPosition,
        difficulty: settings.difficulty,
        status: 'in_progress'
      })
      .select()
      .single();

    if (gameError || !game) {
      toast({ title: 'Failed to start game', variant: 'destructive' });
      await supabase.from('profiles').update({ wallet_balance: walletBalance }).eq('id', user.id);
      return;
    }

    setOpponentName(getRandomOpponent());

    setGameState(prev => ({
      ...prev,
      phase: 'showing',
      gameId: game.id,
      ballPosition,
      entryAmount,
      selectedCup: null,
      isWin: null,
      cupPositions: [0, 1, 2],
      timeLeft: settings.selectionTime
    }));

    // Show ball for 2 seconds, then shuffle
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'shuffling' }));
      
      // After shuffle complete, start selection phase
      setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: 'selecting' }));
      }, settings.shuffleDuration);
    }, 2000);
  }, [user, walletBalance, settings, toast, getRandomOpponent]);

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
    
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      selectedCup: cupIndex,
      isWin
    }));

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
      const rewardAmount = gameState.entryAmount * settings.rewardMultiplier;
      
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
  }, [gameState, user, settings, walletBalance, toast]);

  const resetGame = useCallback(() => {
    setGameState({
      phase: 'idle',
      gameId: null,
      ballPosition: 0,
      selectedCup: null,
      isWin: null,
      cupPositions: [0, 1, 2],
      timeLeft: settings.selectionTime,
      entryAmount: settings.minEntryAmount
    });
  }, [settings]);

  const setEntryAmount = useCallback((amount: number) => {
    setGameState(prev => ({ ...prev, entryAmount: amount }));
  }, []);

  return {
    settings,
    gameState,
    walletBalance,
    opponentName,
    startGame,
    handleSelection,
    resetGame,
    setEntryAmount,
    rewardAmount: gameState.entryAmount * settings.rewardMultiplier
  };
};
