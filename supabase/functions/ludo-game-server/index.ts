/**
 * LUDO GAME SERVER - Server-Authoritative Architecture
 * 
 * This edge function implements a fully server-authoritative game server for Ludo.
 * 
 * Features:
 * 1. Secure cryptographic dice generation (not predictable by clients)
 * 2. Server validates ALL token moves
 * 3. Server controls turn switching
 * 4. Anti-cheat: Rejects invalid moves
 * 5. State persistence with version tracking
 * 6. Reconnect/resync support
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== GAME CONSTANTS =====
const TRACK_LENGTH = 57; // Position 57 = HOME
const SAFE_POSITIONS = new Set([1, 9, 14, 22, 27, 35, 40, 48]); // Safe squares
const STARTING_POSITION = 1;

// ===== MESSAGE TYPES =====
type ServerMessageType = 
  | 'DICE_ROLL'
  | 'TOKEN_MOVE' 
  | 'CAPTURE'
  | 'TURN_SWITCH'
  | 'GAME_STATE'
  | 'GAME_END'
  | 'ERROR'
  | 'SYNC';

interface ServerMessage {
  type: ServerMessageType;
  roomId: string;
  timestamp: number;
  version: number;
  payload: any;
}

interface ClientAction {
  action: 'roll_dice' | 'move_token' | 'request_sync' | 'heartbeat';
  roomId: string;
  userId: string;
  tokenId?: number;
  timestamp: number;
}

interface Token {
  id: number;
  position: number;
  color: string;
}

interface Player {
  id: string;
  name: string;
  uid: string;
  isBot: boolean;
  color: string;
  tokens: Token[];
  tokensHome: number;
  avatar?: string;
}

interface GameState {
  players: Player[];
  currentTurn: number;
  diceValue: number;
  phase: 'waiting' | 'playing' | 'result';
  version: number;
  lastActionTime: number;
  pendingCapture?: {
    capturedColor: string;
    capturedTokenId: number;
    capturerColor: string;
    position: number;
  } | null;
}

// ===== SECURE DICE GENERATION =====
// Uses Web Crypto API for cryptographically secure random numbers
function generateSecureDice(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Map to 1-6 range with uniform distribution
  return (array[0] % 6) + 1;
}

// ===== MOVE VALIDATION =====
function validateMove(
  gameState: GameState,
  playerId: string,
  tokenId: number,
  diceValue: number
): { valid: boolean; error?: string; newPosition?: number } {
  const currentPlayer = gameState.players[gameState.currentTurn];
  
  // Check if it's this player's turn
  if (currentPlayer.id !== playerId) {
    return { valid: false, error: 'NOT_YOUR_TURN' };
  }
  
  // Find the token
  const token = currentPlayer.tokens.find(t => t.id === tokenId);
  if (!token) {
    return { valid: false, error: 'TOKEN_NOT_FOUND' };
  }
  
  // Validate move based on token position
  let newPosition: number;
  
  if (token.position === 0) {
    // Token in base - can only move out with a 6
    if (diceValue !== 6) {
      return { valid: false, error: 'NEED_SIX_TO_EXIT' };
    }
    newPosition = STARTING_POSITION;
  } else {
    // Token on board
    newPosition = token.position + diceValue;
    
    // Check if move exceeds HOME
    if (newPosition > TRACK_LENGTH) {
      return { valid: false, error: 'MOVE_EXCEEDS_HOME' };
    }
  }
  
  return { valid: true, newPosition };
}

// ===== CHECK FOR CAPTURES =====
function checkCapture(
  gameState: GameState,
  movingColor: string,
  newPosition: number
): { captured: boolean; capturedPlayer?: Player; capturedTokenId?: number } {
  // Can't capture on safe positions or HOME track (position >= 52)
  if (SAFE_POSITIONS.has(newPosition) || newPosition >= 52 || newPosition === 0) {
    return { captured: false };
  }
  
  // Check all other players for tokens at this position
  for (const player of gameState.players) {
    if (player.color === movingColor) continue;
    
    for (const token of player.tokens) {
      if (token.position === newPosition && token.position > 0 && token.position < 52) {
        return { 
          captured: true, 
          capturedPlayer: player,
          capturedTokenId: token.id
        };
      }
    }
  }
  
  return { captured: false };
}

// ===== APPLY MOVE =====
function applyMove(
  gameState: GameState,
  playerId: string,
  tokenId: number,
  newPosition: number
): GameState {
  const updatedState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  // Find and update the token
  const playerIndex = updatedState.players.findIndex(p => p.id === playerId);
  const player = updatedState.players[playerIndex];
  const tokenIndex = player.tokens.findIndex(t => t.id === tokenId);
  
  const oldPosition = player.tokens[tokenIndex].position;
  player.tokens[tokenIndex].position = newPosition;
  
  // Check for HOME
  if (newPosition === TRACK_LENGTH) {
    player.tokensHome += 1;
  }
  
  // Check for capture
  const captureResult = checkCapture(updatedState, player.color, newPosition);
  if (captureResult.captured && captureResult.capturedPlayer && captureResult.capturedTokenId !== undefined) {
    // Reset captured token to base
    const capturedPlayerIndex = updatedState.players.findIndex(p => p.id === captureResult.capturedPlayer!.id);
    const capturedTokenIndex = updatedState.players[capturedPlayerIndex].tokens.findIndex(
      t => t.id === captureResult.capturedTokenId
    );
    updatedState.players[capturedPlayerIndex].tokens[capturedTokenIndex].position = 0;
    
    // Store capture info for client animation
    updatedState.pendingCapture = {
      capturedColor: captureResult.capturedPlayer.color,
      capturedTokenId: captureResult.capturedTokenId,
      capturerColor: player.color,
      position: newPosition
    };
  } else {
    updatedState.pendingCapture = null;
  }
  
  updatedState.version += 1;
  updatedState.lastActionTime = Date.now();
  
  return updatedState;
}

// ===== DETERMINE NEXT TURN =====
function getNextTurn(gameState: GameState, diceValue: number, hadCapture: boolean): number {
  // Player gets another turn if:
  // 1. Rolled a 6
  // 2. Captured an opponent token
  if (diceValue === 6 || hadCapture) {
    return gameState.currentTurn;
  }
  
  // Otherwise, next player
  return (gameState.currentTurn + 1) % gameState.players.length;
}

// ===== CHECK WIN CONDITION =====
function checkWinner(gameState: GameState): Player | null {
  for (const player of gameState.players) {
    if (player.tokensHome === 4) {
      return player;
    }
  }
  return null;
}

// ===== CHECK IF PLAYER CAN MOVE =====
function canPlayerMove(gameState: GameState, diceValue: number): boolean {
  const currentPlayer = gameState.players[gameState.currentTurn];
  
  for (const token of currentPlayer.tokens) {
    if (token.position === 0 && diceValue === 6) {
      return true; // Can exit base
    }
    if (token.position > 0 && token.position + diceValue <= TRACK_LENGTH) {
      return true; // Can move on board
    }
  }
  
  return false;
}

// ===== MAIN HANDLER =====
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ClientAction = await req.json();
    const { action, roomId, userId, tokenId, timestamp } = body;

    console.log(`[LudoServer] Action: ${action}, Room: ${roomId}, User: ${userId}`);

    // Fetch current room state
    const { data: room, error: roomError } = await supabase
      .from('ludo_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ 
          type: 'ERROR', 
          error: 'ROOM_NOT_FOUND',
          message: 'Room does not exist'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let gameState: GameState = room.game_state as unknown as GameState || {
      players: [],
      currentTurn: 0,
      diceValue: 1,
      phase: 'waiting',
      version: 0,
      lastActionTime: Date.now(),
      pendingCapture: null
    };

    // Ensure version exists
    if (gameState.version === undefined) {
      gameState.version = 0;
    }

    // ===== HANDLE ACTIONS =====
    switch (action) {
      case 'request_sync': {
        // Return current authoritative state
        const response: ServerMessage = {
          type: 'SYNC',
          roomId,
          timestamp: Date.now(),
          version: gameState.version,
          payload: {
            gameState,
            currentTurn: gameState.currentTurn,
            currentPlayerId: gameState.players[gameState.currentTurn]?.id
          }
        };
        
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'heartbeat': {
        return new Response(JSON.stringify({ 
          type: 'HEARTBEAT_ACK',
          timestamp: Date.now(),
          version: gameState.version
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'roll_dice': {
        // Validate it's this player's turn
        const currentPlayer = gameState.players[gameState.currentTurn];
        if (!currentPlayer || currentPlayer.id !== userId) {
          return new Response(JSON.stringify({
            type: 'ERROR',
            error: 'NOT_YOUR_TURN',
            message: 'It is not your turn to roll'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        // Generate secure dice value
        const diceValue = generateSecureDice();
        gameState.diceValue = diceValue;
        gameState.version += 1;
        gameState.lastActionTime = Date.now();

        // Check if player can make any move
        const canMove = canPlayerMove(gameState, diceValue);
        
        let nextTurn = gameState.currentTurn;
        if (!canMove) {
          // No valid moves - switch turn
          nextTurn = (gameState.currentTurn + 1) % gameState.players.length;
          gameState.currentTurn = nextTurn;
        }

        // Save to database
        await supabase
          .from('ludo_rooms')
          .update({ 
            game_state: gameState as any,
            current_turn: gameState.currentTurn
          })
          .eq('id', roomId);

        // Broadcast via realtime
        const channel = supabase.channel(`ludo-server-${roomId}`);
        await channel.send({
          type: 'broadcast',
          event: 'server_event',
          payload: {
            type: 'DICE_ROLL',
            roomId,
            timestamp: Date.now(),
            version: gameState.version,
            payload: {
              diceValue,
              playerId: userId,
              canMove,
              currentTurn: gameState.currentTurn,
              nextPlayerId: gameState.players[gameState.currentTurn]?.id
            }
          }
        });

        // If no move possible, also send turn switch
        if (!canMove) {
          await channel.send({
            type: 'broadcast',
            event: 'server_event',
            payload: {
              type: 'TURN_SWITCH',
              roomId,
              timestamp: Date.now(),
              version: gameState.version,
              payload: {
                previousTurn: currentPlayer.id,
                currentTurn: gameState.players[nextTurn]?.id,
                turnIndex: nextTurn,
                reason: 'NO_VALID_MOVES'
              }
            }
          });
        }

        const response: ServerMessage = {
          type: 'DICE_ROLL',
          roomId,
          timestamp: Date.now(),
          version: gameState.version,
          payload: {
            diceValue,
            canMove,
            currentTurn: gameState.currentTurn,
            nextPlayerId: gameState.players[gameState.currentTurn]?.id
          }
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'move_token': {
        if (tokenId === undefined) {
          return new Response(JSON.stringify({
            type: 'ERROR',
            error: 'MISSING_TOKEN_ID',
            message: 'Token ID is required'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        // Validate the move
        const validation = validateMove(gameState, userId, tokenId, gameState.diceValue);
        
        if (!validation.valid) {
          console.log(`[LudoServer] Invalid move: ${validation.error}`);
          return new Response(JSON.stringify({
            type: 'ERROR',
            error: validation.error,
            message: `Invalid move: ${validation.error}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        // Apply the move
        const previousState = JSON.parse(JSON.stringify(gameState));
        gameState = applyMove(gameState, userId, tokenId, validation.newPosition!);
        
        const hadCapture = gameState.pendingCapture !== null;
        const winner = checkWinner(gameState);
        
        // Determine next turn
        if (!winner) {
          gameState.currentTurn = getNextTurn(previousState, gameState.diceValue, hadCapture);
        }

        // Handle win
        if (winner) {
          gameState.phase = 'result';
          
          // Update room status
          await supabase
            .from('ludo_rooms')
            .update({ 
              game_state: gameState as any,
              current_turn: gameState.currentTurn,
              status: 'completed',
              winner_id: winner.id,
              ended_at: new Date().toISOString()
            })
            .eq('id', roomId);
        } else {
          // Save updated state
          await supabase
            .from('ludo_rooms')
            .update({ 
              game_state: gameState as any,
              current_turn: gameState.currentTurn
            })
            .eq('id', roomId);
        }

        // Broadcast events
        const channel = supabase.channel(`ludo-server-${roomId}`);
        
        // Token move event
        await channel.send({
          type: 'broadcast',
          event: 'server_event',
          payload: {
            type: 'TOKEN_MOVE',
            roomId,
            timestamp: Date.now(),
            version: gameState.version,
            payload: {
              playerId: userId,
              tokenId,
              fromPosition: previousState.players.find((p: Player) => p.id === userId)
                ?.tokens.find((t: Token) => t.id === tokenId)?.position || 0,
              toPosition: validation.newPosition,
              players: gameState.players
            }
          }
        });

        // Capture event if applicable
        if (hadCapture && gameState.pendingCapture) {
          await channel.send({
            type: 'broadcast',
            event: 'server_event',
            payload: {
              type: 'CAPTURE',
              roomId,
              timestamp: Date.now(),
              version: gameState.version,
              payload: {
                ...gameState.pendingCapture,
                players: gameState.players
              }
            }
          });
        }

        // Turn switch event
        if (!winner) {
          await channel.send({
            type: 'broadcast',
            event: 'server_event',
            payload: {
              type: 'TURN_SWITCH',
              roomId,
              timestamp: Date.now(),
              version: gameState.version,
              payload: {
                previousTurn: userId,
                currentTurn: gameState.players[gameState.currentTurn]?.id,
                turnIndex: gameState.currentTurn,
                reason: hadCapture ? 'CAPTURE_BONUS' : (gameState.diceValue === 6 ? 'ROLLED_SIX' : 'NORMAL')
              }
            }
          });
        }

        // Game end event
        if (winner) {
          await channel.send({
            type: 'broadcast',
            event: 'server_event',
            payload: {
              type: 'GAME_END',
              roomId,
              timestamp: Date.now(),
              version: gameState.version,
              payload: {
                winner: {
                  id: winner.id,
                  name: winner.name,
                  color: winner.color
                },
                finalState: gameState
              }
            }
          });
        }

        const response: ServerMessage = {
          type: 'TOKEN_MOVE',
          roomId,
          timestamp: Date.now(),
          version: gameState.version,
          payload: {
            success: true,
            tokenId,
            newPosition: validation.newPosition,
            capture: gameState.pendingCapture,
            currentTurn: gameState.currentTurn,
            nextPlayerId: gameState.players[gameState.currentTurn]?.id,
            winner: winner ? { id: winner.id, name: winner.name, color: winner.color } : null,
            players: gameState.players
          }
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({
          type: 'ERROR',
          error: 'UNKNOWN_ACTION',
          message: `Unknown action: ${action}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
    }
  } catch (error) {
    console.error('[LudoServer] Error:', error);
    return new Response(JSON.stringify({
      type: 'ERROR',
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
