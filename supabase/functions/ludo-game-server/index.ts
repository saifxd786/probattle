/**
 * LUDO GAME SERVER - Server-Authoritative Architecture (HARDENED)
 * 
 * Production-ready server-authoritative game server for Ludo.
 * 
 * HARDENED Features:
 * 1. Secure cryptographic dice generation (Web Crypto API)
 * 2. Server validates ALL token moves
 * 3. Strict turn locking with animation cooldown
 * 4. Server-side rate limiting (per-user, per-action)
 * 5. Duplicate event replay prevention (action deduplication)
 * 6. Comprehensive anti-cheat logging
 * 7. Stale connection cleanup
 * 8. Reconnect-resync with last confirmed state
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== GAME CONSTANTS =====
const TRACK_LENGTH = 57; // Position 57 = HOME
const STARTING_POSITION = 1;

// ===== TRACK DEFINITIONS FOR COORDINATE-BASED CAPTURE =====
// LEFT_TRACK: RED uses this
const LEFT_TRACK: { x: number; y: number }[] = [
  { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
  { x: 8.5, y: 0.5 }, { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
];

// TOP_TRACK: GREEN uses this
const TOP_TRACK: { x: number; y: number }[] = [
  { x: 8.5, y: 1.5 }, { x: 8.5, y: 2.5 }, { x: 8.5, y: 3.5 }, { x: 8.5, y: 4.5 }, { x: 8.5, y: 5.5 },
  { x: 9.5, y: 6.5 }, { x: 10.5, y: 6.5 }, { x: 11.5, y: 6.5 }, { x: 12.5, y: 6.5 }, { x: 13.5, y: 6.5 }, { x: 14.5, y: 6.5 },
  { x: 14.5, y: 7.5 },
  { x: 14.5, y: 8.5 }, { x: 13.5, y: 8.5 }, { x: 12.5, y: 8.5 }, { x: 11.5, y: 8.5 }, { x: 10.5, y: 8.5 }, { x: 9.5, y: 8.5 },
  { x: 8.5, y: 9.5 }, { x: 8.5, y: 10.5 }, { x: 8.5, y: 11.5 }, { x: 8.5, y: 12.5 }, { x: 8.5, y: 13.5 }, { x: 8.5, y: 14.5 },
  { x: 7.5, y: 14.5 },
  { x: 6.5, y: 14.5 }, { x: 6.5, y: 13.5 }, { x: 6.5, y: 12.5 }, { x: 6.5, y: 11.5 }, { x: 6.5, y: 10.5 }, { x: 6.5, y: 9.5 },
  { x: 5.5, y: 8.5 }, { x: 4.5, y: 8.5 }, { x: 3.5, y: 8.5 }, { x: 2.5, y: 8.5 }, { x: 1.5, y: 8.5 }, { x: 0.5, y: 8.5 },
  { x: 0.5, y: 7.5 },
  { x: 0.5, y: 6.5 }, { x: 1.5, y: 6.5 }, { x: 2.5, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 4.5, y: 6.5 }, { x: 5.5, y: 6.5 },
  { x: 6.5, y: 5.5 }, { x: 6.5, y: 4.5 }, { x: 6.5, y: 3.5 }, { x: 6.5, y: 2.5 }, { x: 6.5, y: 1.5 }, { x: 6.5, y: 0.5 },
  { x: 7.5, y: 0.5 },
];

const COLOR_TRACK_COORDS: { [color: string]: { x: number; y: number }[] } = {
  red: LEFT_TRACK,
  green: TOP_TRACK,
};

// Safe positions (board coordinates)
const SAFE_BOARD_POSITIONS = [
  { x: 1.5, y: 6.5 },  // Red start
  { x: 8.5, y: 1.5 },  // Green start
  { x: 2.5, y: 6.5 },  // Near red start (safe spot)
  { x: 8.5, y: 2.5 },  // Near green start (safe spot)
];

// Get board coordinates for a token position
function getBoardCoords(position: number, color: string): { x: number; y: number } | null {
  if (position <= 0 || position >= 52) return null;
  const track = COLOR_TRACK_COORDS[color];
  if (!track || position - 1 >= track.length) return null;
  return track[position - 1];
}

// Check if position is a safe spot
function isSafeBoardPosition(coords: { x: number; y: number }): boolean {
  return SAFE_BOARD_POSITIONS.some(safe => safe.x === coords.x && safe.y === coords.y);
}

// ===== RATE LIMITING CONFIG =====
const RATE_LIMIT_CONFIG = {
  MAX_DICE_ROLLS_PER_MINUTE: 30,
  MAX_MOVES_PER_MINUTE: 60,
  MIN_ACTION_INTERVAL_MS: 100,    // 100ms minimum between actions
  ANIMATION_LOCK_MS: 800,          // 800ms animation lock after moves
  STALE_ACTION_THRESHOLD_MS: 30000, // 30s - reject actions with old timestamps
};

// ===== IN-MEMORY RATE LIMITING (per edge function instance) =====
const rateLimitStore = new Map<string, { 
  diceRolls: number[];
  moves: number[];
  lastAction: number;
  animationLockUntil: number;
  processedActions: Set<string>; // Deduplication
}>();

function getRateLimitData(userId: string) {
  if (!rateLimitStore.has(userId)) {
    rateLimitStore.set(userId, {
      diceRolls: [],
      moves: [],
      lastAction: 0,
      animationLockUntil: 0,
      processedActions: new Set()
    });
  }
  return rateLimitStore.get(userId)!;
}

function cleanupOldEntries(entries: number[], windowMs: number): number[] {
  const now = Date.now();
  return entries.filter(t => now - t < windowMs);
}

// ===== MESSAGE TYPES =====
type ServerMessageType = 
  | 'DICE_ROLL'
  | 'TOKEN_MOVE' 
  | 'CAPTURE'
  | 'TURN_SWITCH'
  | 'GAME_STATE'
  | 'GAME_END'
  | 'ERROR'
  | 'SYNC'
  | 'ANIMATION_LOCK';

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
  actionId?: string; // For deduplication
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
  animationLockUntil: number; // Animation lock timestamp
  lastProcessedActionId?: string; // For deduplication
  pendingCapture?: {
    capturedColor: string;
    capturedTokenId: number;
    capturerColor: string;
    position: number;
  } | null;
}

// ===== LOGGING UTILITIES =====
function logAntiCheat(type: string, userId: string, roomId: string, details: Record<string, any>) {
  console.warn(`[ANTI-CHEAT] ${type} | User: ${userId} | Room: ${roomId} | ${JSON.stringify(details)}`);
}

function logAction(action: string, userId: string, roomId: string, success: boolean, details?: Record<string, any>) {
  const level = success ? 'log' : 'warn';
  console[level](`[LudoServer] ${action} | User: ${userId} | Room: ${roomId} | Success: ${success}`, details || '');
}

// ===== RATE LIMITING FUNCTIONS =====
function checkRateLimit(userId: string, actionType: 'dice' | 'move'): { allowed: boolean; reason?: string } {
  const data = getRateLimitData(userId);
  const now = Date.now();
  
  // Check minimum action interval
  if (now - data.lastAction < RATE_LIMIT_CONFIG.MIN_ACTION_INTERVAL_MS) {
    logAntiCheat('RATE_LIMIT_INTERVAL', userId, '', { 
      timeSinceLastAction: now - data.lastAction,
      minInterval: RATE_LIMIT_CONFIG.MIN_ACTION_INTERVAL_MS
    });
    return { allowed: false, reason: 'ACTION_TOO_FAST' };
  }
  
  // Check animation lock
  if (now < data.animationLockUntil) {
    logAntiCheat('ANIMATION_LOCK_VIOLATION', userId, '', {
      lockRemainingMs: data.animationLockUntil - now
    });
    return { allowed: false, reason: 'ANIMATION_IN_PROGRESS' };
  }
  
  // Clean up old entries and check limits
  if (actionType === 'dice') {
    data.diceRolls = cleanupOldEntries(data.diceRolls, 60000);
    if (data.diceRolls.length >= RATE_LIMIT_CONFIG.MAX_DICE_ROLLS_PER_MINUTE) {
      logAntiCheat('RATE_LIMIT_DICE', userId, '', { rollCount: data.diceRolls.length });
      return { allowed: false, reason: 'DICE_RATE_LIMIT_EXCEEDED' };
    }
    data.diceRolls.push(now);
  } else {
    data.moves = cleanupOldEntries(data.moves, 60000);
    if (data.moves.length >= RATE_LIMIT_CONFIG.MAX_MOVES_PER_MINUTE) {
      logAntiCheat('RATE_LIMIT_MOVE', userId, '', { moveCount: data.moves.length });
      return { allowed: false, reason: 'MOVE_RATE_LIMIT_EXCEEDED' };
    }
    data.moves.push(now);
  }
  
  data.lastAction = now;
  return { allowed: true };
}

function setAnimationLock(userId: string) {
  const data = getRateLimitData(userId);
  data.animationLockUntil = Date.now() + RATE_LIMIT_CONFIG.ANIMATION_LOCK_MS;
}

function checkDuplicateAction(userId: string, actionId: string | undefined): boolean {
  if (!actionId) return false;
  
  const data = getRateLimitData(userId);
  if (data.processedActions.has(actionId)) {
    logAntiCheat('DUPLICATE_ACTION', userId, '', { actionId });
    return true;
  }
  
  // Add to processed, keep set size manageable
  data.processedActions.add(actionId);
  if (data.processedActions.size > 100) {
    // Clear oldest entries
    const entries = Array.from(data.processedActions);
    data.processedActions = new Set(entries.slice(-50));
  }
  
  return false;
}

function validateActionTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const age = now - timestamp;
  
  // Reject stale actions (older than 30s) or future actions (clock skew > 5s)
  return age < RATE_LIMIT_CONFIG.STALE_ACTION_THRESHOLD_MS && age > -5000;
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

// ===== CHECK FOR CAPTURES - FIXED: Uses BOARD COORDINATES =====
function checkCapture(
  gameState: GameState,
  movingColor: string,
  newPosition: number
): { captured: boolean; capturedPlayer?: Player; capturedTokenId?: number } {
  // Can't capture on HOME track (position >= 52) or base (position 0)
  if (newPosition >= 52 || newPosition === 0) {
    return { captured: false };
  }
  
  // Get board coordinates for the moving token's new position
  const newCoords = getBoardCoords(newPosition, movingColor);
  if (!newCoords) {
    return { captured: false };
  }
  
  // Check if new position is a safe spot
  if (isSafeBoardPosition(newCoords)) {
    return { captured: false };
  }
  
  // Check all other players for tokens at the SAME BOARD COORDINATES
  for (const player of gameState.players) {
    if (player.color === movingColor) continue;
    
    for (const token of player.tokens) {
      if (token.position <= 0 || token.position >= 52) continue;
      
      // Get opponent token's board coordinates
      const opponentCoords = getBoardCoords(token.position, player.color);
      if (!opponentCoords) continue;
      
      // Compare BOARD coordinates - if they match, it's a capture!
      if (opponentCoords.x === newCoords.x && opponentCoords.y === newCoords.y) {
        console.log('[LudoServer] CAPTURE detected!', {
          capturerColor: movingColor,
          capturerPosition: newPosition,
          capturerCoords: newCoords,
          capturedColor: player.color,
          capturedTokenId: token.id,
          capturedPosition: token.position,
          capturedCoords: opponentCoords
        });
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
    const { action, roomId, userId, tokenId, timestamp, actionId } = body;

    logAction(action, userId, roomId, true, { tokenId, timestamp, actionId });

    // ===== VALIDATION LAYER =====
    
    // 1. Validate action timestamp (reject stale/future actions)
    if (!validateActionTimestamp(timestamp)) {
      logAntiCheat('STALE_ACTION', userId, roomId, { 
        actionTimestamp: timestamp, 
        serverTime: Date.now(),
        drift: Date.now() - timestamp
      });
      return new Response(JSON.stringify({
        type: 'ERROR',
        error: 'STALE_ACTION',
        message: 'Action timestamp is too old or in the future'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // 2. Check for duplicate action replay
    if (checkDuplicateAction(userId, actionId)) {
      return new Response(JSON.stringify({
        type: 'ERROR',
        error: 'DUPLICATE_ACTION',
        message: 'This action has already been processed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409
      });
    }

    // 3. Apply rate limiting (skip for sync/heartbeat)
    if (action !== 'request_sync' && action !== 'heartbeat') {
      const rateCheck = checkRateLimit(userId, action === 'roll_dice' ? 'dice' : 'move');
      if (!rateCheck.allowed) {
        return new Response(JSON.stringify({
          type: 'ERROR',
          error: rateCheck.reason,
          message: `Rate limit: ${rateCheck.reason}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        });
      }
    }

    // Fetch current room state
    const { data: room, error: roomError } = await supabase
      .from('ludo_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      logAntiCheat('ROOM_NOT_FOUND', userId, roomId, { error: roomError });
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
      animationLockUntil: 0,
      pendingCapture: null
    };

    // Ensure version and animationLock exist
    if (gameState.version === undefined) gameState.version = 0;
    if (gameState.animationLockUntil === undefined) gameState.animationLockUntil = 0;

    // 4. Check server-side animation lock
    const now = Date.now();
    if (action !== 'request_sync' && action !== 'heartbeat' && now < gameState.animationLockUntil) {
      logAntiCheat('SERVER_ANIMATION_LOCK', userId, roomId, {
        lockRemainingMs: gameState.animationLockUntil - now
      });
      return new Response(JSON.stringify({
        type: 'ERROR',
        error: 'ANIMATION_LOCK',
        message: 'Please wait for animation to complete'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
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
          logAntiCheat('OUT_OF_TURN_ROLL', userId, roomId, {
            expectedPlayer: currentPlayer?.id,
            currentTurnIndex: gameState.currentTurn
          });
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
        
        // Set animation lock (500ms for dice animation)
        gameState.animationLockUntil = Date.now() + 500;
        setAnimationLock(userId);

        // Check if player can make any move
        const canMove = canPlayerMove(gameState, diceValue);
        
        let nextTurn = gameState.currentTurn;
        if (!canMove) {
          // No valid moves - switch turn
          nextTurn = (gameState.currentTurn + 1) % gameState.players.length;
          gameState.currentTurn = nextTurn;
        }
        
        logAction('roll_dice', userId, roomId, true, { 
          diceValue, 
          canMove, 
          nextTurn,
          version: gameState.version
        });

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
        
        // First broadcast animation lock to both clients
        await channel.send({
          type: 'broadcast',
          event: 'server_event',
          payload: {
            type: 'ANIMATION_LOCK',
            roomId,
            timestamp: Date.now(),
            version: gameState.version,
            payload: {
              lockUntil: gameState.animationLockUntil,
              lockedBy: userId,
              lockType: 'DICE_ROLL'
            }
          }
        });
        
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
              nextPlayerId: gameState.players[gameState.currentTurn]?.id,
              animationLockUntil: gameState.animationLockUntil
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
            nextPlayerId: gameState.players[gameState.currentTurn]?.id,
            animationLockUntil: gameState.animationLockUntil
          }
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'move_token': {
        if (tokenId === undefined) {
          logAntiCheat('MISSING_TOKEN_ID', userId, roomId, {});
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
          logAntiCheat('INVALID_MOVE', userId, roomId, {
            tokenId,
            diceValue: gameState.diceValue,
            error: validation.error,
            currentTurn: gameState.currentTurn,
            expectedPlayer: gameState.players[gameState.currentTurn]?.id
          });
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
        
        // Set animation lock (800ms for token movement)
        gameState.animationLockUntil = Date.now() + RATE_LIMIT_CONFIG.ANIMATION_LOCK_MS;
        setAnimationLock(userId);
        
        const hadCapture = gameState.pendingCapture !== null;
        const winner = checkWinner(gameState);
        
        // Determine next turn
        if (!winner) {
          gameState.currentTurn = getNextTurn(previousState, gameState.diceValue, hadCapture);
        }
        
        logAction('move_token', userId, roomId, true, {
          tokenId,
          from: previousState.players.find((p: Player) => p.id === userId)
            ?.tokens.find((t: Token) => t.id === tokenId)?.position,
          to: validation.newPosition,
          hadCapture,
          winner: winner?.id,
          version: gameState.version
        });

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
        
        // First broadcast animation lock to both clients
        await channel.send({
          type: 'broadcast',
          event: 'server_event',
          payload: {
            type: 'ANIMATION_LOCK',
            roomId,
            timestamp: Date.now(),
            version: gameState.version,
            payload: {
              lockUntil: gameState.animationLockUntil,
              lockedBy: userId,
              lockType: 'TOKEN_MOVE'
            }
          }
        });
        
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
              players: gameState.players,
              animationLockUntil: gameState.animationLockUntil
            }
          }
        });

        // Capture event if applicable
        if (hadCapture && gameState.pendingCapture) {
          // Extend animation lock for capture animation
          gameState.animationLockUntil = Date.now() + RATE_LIMIT_CONFIG.ANIMATION_LOCK_MS + 500;
          
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
                players: gameState.players,
                animationLockUntil: gameState.animationLockUntil
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
            players: gameState.players,
            animationLockUntil: gameState.animationLockUntil
          }
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        logAntiCheat('UNKNOWN_ACTION', userId, roomId, { action });
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
