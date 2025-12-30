import { useState, useEffect, useCallback } from 'react';
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

export const useLudoGame = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
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
  
  const [entryAmount, setEntryAmount] = useState(100);
  const [playerMode, setPlayerMode] = useState<2 | 4>(2);
  const [walletBalance, setWalletBalance] = useState(0);

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

  const getRandomBotName = useCallback((usedNames: string[]) => {
    const available = BOT_NAMES.filter(name => !usedNames.includes(name));
    return available[Math.floor(Math.random() * available.length)] || BOT_NAMES[0];
  }, []);

  const createInitialTokens = (color: string): Token[] => {
    return [0, 1, 2, 3].map(id => ({ id, position: 0, color }));
  };

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
      // Refund
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

    // Initialize players with user
    const userPlayer: Player = {
      id: user.id,
      name: user.email?.split('@')[0] || 'You',
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

    // Simulate bot joining after delays
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

        // Mark bot as ready after short delay
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => 
              p.id === botPlayer.id ? { ...p, status: 'ready' } : p
            )
          }));
        }, 500 + Math.random() * 1000);
      }, 1500 * i + Math.random() * 1000);
    }

    // Start game after all players join
    setTimeout(() => {
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
    }, 2000 * playerMode);
  }, [user, walletBalance, entryAmount, playerMode, settings, toast, getRandomBotName]);

  const rollDice = useCallback(async () => {
    if (!gameState.canRoll || gameState.isRolling) return;

    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));

    // Simulate dice roll animation
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate dice value (with difficulty weighting for bots)
    const currentPlayer = gameState.players[gameState.currentTurn];
    let diceValue: number;

    if (currentPlayer.isBot) {
      // Bot dice - weighted based on difficulty
      const weights = {
        easy: [0.2, 0.2, 0.2, 0.2, 0.1, 0.1],
        normal: [0.167, 0.167, 0.167, 0.167, 0.167, 0.167],
        competitive: [0.1, 0.1, 0.15, 0.2, 0.2, 0.25]
      };
      const w = weights[settings.difficulty];
      const rand = Math.random();
      let cumulative = 0;
      diceValue = 1;
      for (let i = 0; i < w.length; i++) {
        cumulative += w[i];
        if (rand < cumulative) {
          diceValue = i + 1;
          break;
        }
      }
    } else {
      // User dice - fair random
      diceValue = Math.floor(Math.random() * 6) + 1;
    }

    setGameState(prev => ({ ...prev, diceValue, isRolling: false }));

    // Check if player can move any token
    const canMove = currentPlayer.tokens.some(token => {
      if (token.position === 0 && diceValue === 6) return true;
      if (token.position > 0 && token.position + diceValue <= 57) return true;
      return false;
    });

    if (!canMove) {
      // No valid moves, skip to next player
      setTimeout(() => nextTurn(), 1000);
    } else if (currentPlayer.isBot) {
      // Bot makes move automatically
      setTimeout(() => botMakeMove(diceValue), 1000);
    } else {
      // User needs to select token
      setGameState(prev => ({ ...prev, canRoll: false }));
    }
  }, [gameState, settings.difficulty]);

  const botMakeMove = useCallback((diceValue: number) => {
    const currentPlayer = gameState.players[gameState.currentTurn];
    
    // Simple bot AI: prefer moving tokens that are furthest along
    const movableTokens = currentPlayer.tokens.filter(token => {
      if (token.position === 0 && diceValue === 6) return true;
      if (token.position > 0 && token.position + diceValue <= 57) return true;
      return false;
    });

    if (movableTokens.length > 0) {
      // Prefer moving out of home with 6, otherwise move furthest token
      const tokenToMove = diceValue === 6 && movableTokens.find(t => t.position === 0)
        ? movableTokens.find(t => t.position === 0)!
        : movableTokens.reduce((prev, curr) => curr.position > prev.position ? curr : prev);

      moveToken(currentPlayer.color, tokenToMove.id, diceValue);
    } else {
      nextTurn();
    }
  }, [gameState]);

  const moveToken = useCallback((color: string, tokenId: number, diceValue: number) => {
    soundManager.playTokenMove();
    hapticManager.tokenMove();
    
    setGameState(prev => {
      const updatedPlayers = prev.players.map(player => {
        if (player.color !== color) return player;

        const updatedTokens = player.tokens.map(token => {
          if (token.id !== tokenId) return token;

          let newPosition = token.position;
          if (token.position === 0 && diceValue === 6) {
            newPosition = 1; // Enter the board
            soundManager.playTokenEnter();
            hapticManager.tokenEnter();
          } else if (token.position > 0) {
            newPosition = Math.min(token.position + diceValue, 57);
            if (newPosition === 57) {
              soundManager.playTokenHome();
              hapticManager.tokenHome();
            }
          }

          return { ...token, position: newPosition };
        });

        // Check if token reached home
        const tokensHome = updatedTokens.filter(t => t.position === 57).length;

        return { ...player, tokens: updatedTokens, tokensHome };
      });

      // Check for winner
      const winner = updatedPlayers.find(p => p.tokensHome === 4);
      if (winner) {
        return {
          ...prev,
          players: updatedPlayers,
          phase: 'result',
          winner,
          canRoll: false
        };
      }

      return { ...prev, players: updatedPlayers };
    });

    // If rolled 6, player gets another turn
    if (diceValue === 6) {
      setTimeout(() => {
        setGameState(prev => ({ ...prev, canRoll: true }));
      }, 500);
    } else {
      setTimeout(() => nextTurn(), 500);
    }
  }, []);

  const nextTurn = useCallback(() => {
    soundManager.playTurnChange();
    
    setGameState(prev => {
      const nextPlayerIndex = (prev.currentTurn + 1) % prev.players.length;
      const isUserTurn = !prev.players[nextPlayerIndex].isBot;

      return {
        ...prev,
        currentTurn: nextPlayerIndex,
        canRoll: isUserTurn,
        selectedToken: null
      };
    });

    // If next player is bot, auto-roll after delay
    setGameState(prev => {
      if (prev.players[prev.currentTurn].isBot) {
        setTimeout(() => rollDice(), 1000 + Math.random() * 1500);
      }
      return prev;
    });
  }, [rollDice]);

  const handleTokenClick = useCallback((color: string, tokenId: number) => {
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer.color !== color || currentPlayer.isBot) return;

    const token = currentPlayer.tokens.find(t => t.id === tokenId);
    if (!token) return;

    // Check if token can move
    const canMove = 
      (token.position === 0 && gameState.diceValue === 6) ||
      (token.position > 0 && token.position + gameState.diceValue <= 57);

    if (canMove) {
      moveToken(color, tokenId, gameState.diceValue);
    }
  }, [gameState, moveToken]);

  const handleGameEnd = useCallback(async (winner: Player) => {
    if (!user || !gameState.matchId) return;

    const isUserWinner = winner.id === user.id;
    const rewardAmount = entryAmount * settings.rewardMultiplier;

    // Update match
    await supabase.from('ludo_matches').update({
      status: 'completed',
      winner_id: isUserWinner ? user.id : null,
      ended_at: new Date().toISOString()
    }).eq('id', gameState.matchId);

    if (isUserWinner) {
      // Credit reward to wallet
      await supabase.from('profiles').update({
        wallet_balance: walletBalance + rewardAmount
      }).eq('id', user.id);

      // Record win transaction
      await supabase.from('ludo_transactions').insert({
        user_id: user.id,
        match_id: gameState.matchId,
        amount: rewardAmount,
        type: 'win'
      });

      setWalletBalance(prev => prev + rewardAmount);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '🎉 Ludo Victory!',
        message: `You won ₹${rewardAmount} in Ludo!`,
        type: 'success'
      });
    }
  }, [user, gameState.matchId, entryAmount, settings.rewardMultiplier, walletBalance]);

  const resetGame = useCallback(() => {
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
    rewardAmount: entryAmount * settings.rewardMultiplier
  };
};