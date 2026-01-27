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
  const botTurnRef = useRef<boolean>(false);
  const gameInProgressRef = useRef<boolean>(false);
  
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

  const createInitialTokens = useCallback((color: string): Token[] => {
    return [0, 1, 2, 3].map(id => ({ id, position: 0, color }));
  }, []);

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
        }, 500 + Math.random() * 500);
      }, 1000 * i + Math.random() * 800);
    }

    // Start game after all players join
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
  }, [user, walletBalance, entryAmount, playerMode, settings, toast, getRandomBotName, createInitialTokens]);

  // Generate dice value
  const generateDiceValue = useCallback((isBot: boolean): number => {
    if (isBot) {
      // Bot dice - weighted based on difficulty
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
        if (rand < cumulative) {
          return i + 1;
        }
      }
      return 6;
    } else {
      // User dice - fair random
      return Math.floor(Math.random() * 6) + 1;
    }
  }, [settings.difficulty]);

  // Move token function
  const moveToken = useCallback((color: string, tokenId: number, diceValue: number, players: Player[]): { updatedPlayers: Player[]; winner: Player | null; gotSix: boolean; capturedOpponent: boolean } => {
    soundManager.playTokenMove();
    hapticManager.tokenMove();
    
    let winner: Player | null = null;
    let capturedOpponent = false;
    let newTokenPosition = 0;

    // First, calculate the new position
    const movingPlayer = players.find(p => p.color === color);
    const movingToken = movingPlayer?.tokens.find(t => t.id === tokenId);
    
    if (movingToken) {
      if (movingToken.position === 0 && diceValue === 6) {
        newTokenPosition = 1;
      } else if (movingToken.position > 0) {
        newTokenPosition = Math.min(movingToken.position + diceValue, 57);
      }
    }
    
    const updatedPlayers = players.map(player => {
      if (player.color === color) {
        // Update moving player's token
        const updatedTokens = player.tokens.map(token => {
          if (token.id !== tokenId) return token;

          let newPosition = token.position;
          if (token.position === 0 && diceValue === 6) {
            newPosition = 1;
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

        const tokensHome = updatedTokens.filter(t => t.position === 57).length;
        const updatedPlayer = { ...player, tokens: updatedTokens, tokensHome };
        
        if (tokensHome === 4) {
          winner = updatedPlayer;
        }

        return updatedPlayer;
      } else {
        // Check if any of this player's tokens get captured
        // Safe zones: positions that are safe from capture (home column positions 52-57, start positions)
        const isSafePosition = newTokenPosition >= 52 || newTokenPosition === 0;
        
        if (!isSafePosition && newTokenPosition > 0) {
          const updatedTokens = player.tokens.map(token => {
            // If opponent's token is at the same position as our new position, send it home
            if (token.position === newTokenPosition && token.position > 0 && token.position < 52) {
              capturedOpponent = true;
              return { ...token, position: 0 };
            }
            return token;
          });
          return { ...player, tokens: updatedTokens };
        }
        
        return player;
      }
    });

    // Play capture sound if we captured an opponent
    if (capturedOpponent) {
      setTimeout(() => {
        soundManager.playCapture();
        hapticManager.tokenCapture();
      }, 200);
    }

    return { updatedPlayers, winner, gotSix: diceValue === 6, capturedOpponent };
  }, []);

  // Bot AI to select best move
  const selectBotMove = useCallback((player: Player, diceValue: number): number | null => {
    const movableTokens = player.tokens.filter(token => {
      if (token.position === 0 && diceValue === 6) return true;
      if (token.position > 0 && token.position + diceValue <= 57) return true;
      return false;
    });

    if (movableTokens.length === 0) return null;

    // Priority: 1. Get token home if possible, 2. Move out with 6, 3. Move furthest token
    const tokenToHome = movableTokens.find(t => t.position > 0 && t.position + diceValue === 57);
    if (tokenToHome) return tokenToHome.id;

    if (diceValue === 6) {
      const tokenInHome = movableTokens.find(t => t.position === 0);
      if (tokenInHome) return tokenInHome.id;
    }

    // Move the furthest token
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

      // Start rolling animation
      setTimeout(() => {
        setGameState(inner => ({ ...inner, isRolling: true, canRoll: false }));
        
        // After roll animation
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
              // Bot can move
              setTimeout(() => {
                setGameState(moveState => {
                  const { updatedPlayers, winner, gotSix } = moveToken(
                    botPlayer.color, 
                    tokenId, 
                    diceValue, 
                    moveState.players
                  );

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
                    // Bot gets another turn
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

                  // Next player's turn
                  const nextTurn = (moveState.currentTurn + 1) % moveState.players.length;
                  const isNextUser = !moveState.players[nextTurn]?.isBot;
                  
                  botTurnRef.current = false;
                  soundManager.playTurnChange();
                  
                  // Schedule next bot turn if needed
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
              // No valid move, skip turn
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
    if (!gameState.canRoll || gameState.isRolling) return;
    
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer?.isBot) return;

    setGameState(prev => ({ ...prev, isRolling: true, canRoll: false }));

    await new Promise(resolve => setTimeout(resolve, 800));

    const diceValue = generateDiceValue(false);
    
    setGameState(prev => {
      const player = prev.players[prev.currentTurn];
      
      // Check if user can move any token
      const canMove = player.tokens.some(token => {
        if (token.position === 0 && diceValue === 6) return true;
        if (token.position > 0 && token.position + diceValue <= 57) return true;
        return false;
      });

      if (!canMove) {
        // No valid moves, go to next turn after delay
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
  }, [gameState.canRoll, gameState.isRolling, gameState.players, gameState.currentTurn, generateDiceValue, executeBotTurn]);

  // Handle user token click
  const handleTokenClick = useCallback((color: string, tokenId: number) => {
    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentTurn];
      if (currentPlayer.color !== color || currentPlayer.isBot || prev.canRoll) return prev;

      const token = currentPlayer.tokens.find(t => t.id === tokenId);
      if (!token) return prev;

      const canMove = 
        (token.position === 0 && prev.diceValue === 6) ||
        (token.position > 0 && token.position + prev.diceValue <= 57);

      if (!canMove) return prev;

      const { updatedPlayers, winner, gotSix } = moveToken(color, tokenId, prev.diceValue, prev.players);

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
