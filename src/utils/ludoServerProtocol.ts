/**
 * LUDO SERVER PROTOCOL - Message Types & Handlers
 * 
 * Defines the WebSocket message format for server-authoritative Ludo.
 * All game actions go through the server for validation.
 */

// ===== SERVER MESSAGE TYPES =====
export type ServerMessageType = 
  | 'DICE_ROLL'
  | 'TOKEN_MOVE'
  | 'CAPTURE'
  | 'TURN_SWITCH'
  | 'GAME_STATE'
  | 'GAME_END'
  | 'ERROR'
  | 'SYNC'
  | 'HEARTBEAT_ACK';

export type ClientActionType = 
  | 'roll_dice'
  | 'move_token'
  | 'request_sync'
  | 'heartbeat';

// ===== MESSAGE FORMATS =====

/**
 * Base server message structure
 */
export interface ServerMessage<T = any> {
  type: ServerMessageType;
  roomId: string;
  timestamp: number;
  version: number;
  payload: T;
}

/**
 * Client action request with deduplication
 */
export interface ClientAction {
  action: ClientActionType;
  roomId: string;
  userId: string;
  tokenId?: number;
  timestamp: number;
  actionId: string; // Required for deduplication
}

// ===== PAYLOAD TYPES =====

export interface DiceRollPayload {
  diceValue: number;
  playerId: string;
  canMove: boolean;
  currentTurn: number;
  nextPlayerId: string;
}

export interface TokenMovePayload {
  playerId: string;
  tokenId: number;
  fromPosition: number;
  toPosition: number;
  players: ServerPlayer[];
}

export interface CapturePayload {
  capturedColor: string;
  capturedTokenId: number;
  capturerColor: string;
  position: number;
  players: ServerPlayer[];
}

export interface TurnSwitchPayload {
  previousTurn: string;
  currentTurn: string;
  turnIndex: number;
  reason: 'NORMAL' | 'ROLLED_SIX' | 'CAPTURE_BONUS' | 'NO_VALID_MOVES';
}

export interface GameEndPayload {
  winner: {
    id: string;
    name: string;
    color: string;
  };
  finalState: ServerGameState;
}

export interface SyncPayload {
  gameState: ServerGameState;
  currentTurn: number;
  currentPlayerId: string;
}

export interface ErrorPayload {
  error: string;
  message: string;
}

// ===== GAME STATE TYPES =====

export interface ServerToken {
  id: number;
  position: number;
  color: string;
}

export interface ServerPlayer {
  id: string;
  name: string;
  uid: string;
  isBot: boolean;
  color: string;
  tokens: ServerToken[];
  tokensHome: number;
  avatar?: string;
}

export interface ServerGameState {
  players: ServerPlayer[];
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

// ===== SYNC CONFIGURATION (Ludo King-style real-time feel) =====
export const SERVER_SYNC_CONFIG = {
  // Server communication
  SERVER_TIMEOUT_MS: 5000,        // 5s timeout for server responses
  
  // FASTER HEARTBEAT for Ludo King feel (5s instead of 30s)
  HEARTBEAT_INTERVAL_MS: 5000,    // 5s heartbeat for responsive disconnect detection
  HEARTBEAT_TIMEOUT_MS: 3000,     // 3s timeout - if no response, consider disconnected
  MISSED_HEARTBEATS_DISCONNECT: 2, // 2 missed = disconnected (10s total)
  
  // Delta sync (30-50ms target)
  DELTA_BROADCAST_INTERVAL_MS: 40, // 40ms between delta broadcasts
  MAX_DELTA_QUEUE_SIZE: 10,       // Max queued delta events
  
  // Reconnection
  RECONNECT_SYNC_DELAY_MS: 100,   // 100ms delay before resync on reconnect
  MAX_VERSION_DRIFT: 5,           // Max version difference before force sync
  
  // UI smoothing (Kalman kept for display only)
  UI_LATENCY_SAMPLES: 20,
  UI_EMA_WEIGHT: 0.85,
  
  // Anti-cheat
  MAX_ACTIONS_PER_SECOND: 10,     // Rate limit per player
  ACTION_COOLDOWN_MS: 100,        // Min time between actions
  
  // Optimistic animations (mask server latency)
  OPTIMISTIC_DICE_DURATION_MS: 800,   // Show dice rolling animation
  OPTIMISTIC_MOVE_DURATION_MS: 600,   // Token move animation time
  LATENCY_MASK_THRESHOLD_MS: 150,     // If latency > this, extend animations
} as const;

// ===== OPTIMISTIC ANIMATION TYPES =====
export interface OptimisticDiceRoll {
  startTime: number;
  isOptimistic: boolean;
  serverConfirmed: boolean;
  serverValue: number | null;
}

export interface OptimisticTokenMove {
  tokenId: number;
  fromPosition: number;
  toPosition: number;
  startTime: number;
  isOptimistic: boolean;
  serverConfirmed: boolean;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Generate unique action ID for deduplication
 */
function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a client action message with unique ID
 */
export function createAction(
  action: ClientActionType,
  roomId: string,
  userId: string,
  tokenId?: number
): ClientAction {
  return {
    action,
    roomId,
    userId,
    tokenId,
    timestamp: Date.now(),
    actionId: generateActionId()
  };
}

/**
 * Parse server message
 */
export function parseServerMessage<T = any>(data: string): ServerMessage<T> | null {
  try {
    return JSON.parse(data) as ServerMessage<T>;
  } catch {
    console.error('[ServerProtocol] Failed to parse message:', data);
    return null;
  }
}

/**
 * Validate server message version
 */
export function isValidVersion(
  receivedVersion: number,
  localVersion: number
): { valid: boolean; needsSync: boolean } {
  if (receivedVersion === localVersion + 1) {
    return { valid: true, needsSync: false };
  }
  if (receivedVersion > localVersion + SERVER_SYNC_CONFIG.MAX_VERSION_DRIFT) {
    return { valid: false, needsSync: true };
  }
  if (receivedVersion <= localVersion) {
    // Old message, ignore
    return { valid: false, needsSync: false };
  }
  // Small gap, accept but flag for potential sync
  return { valid: true, needsSync: receivedVersion > localVersion + 2 };
}

/**
 * Rate limiter for client actions
 */
export class ActionRateLimiter {
  private lastActionTime = 0;
  private actionCount = 0;
  private windowStart = Date.now();
  
  canPerformAction(): boolean {
    const now = Date.now();
    
    // Reset window every second
    if (now - this.windowStart > 1000) {
      this.actionCount = 0;
      this.windowStart = now;
    }
    
    // Check rate limit
    if (this.actionCount >= SERVER_SYNC_CONFIG.MAX_ACTIONS_PER_SECOND) {
      console.warn('[RateLimiter] Rate limit exceeded');
      return false;
    }
    
    // Check cooldown
    if (now - this.lastActionTime < SERVER_SYNC_CONFIG.ACTION_COOLDOWN_MS) {
      return false;
    }
    
    this.actionCount++;
    this.lastActionTime = now;
    return true;
  }
  
  reset(): void {
    this.lastActionTime = 0;
    this.actionCount = 0;
    this.windowStart = Date.now();
  }
}

/**
 * Simple latency tracker for UI display only (Kalman kept for smoothing)
 */
export class UILatencyTracker {
  private samples: number[] = [];
  private emaLatency = 50;
  
  addSample(latency: number): void {
    this.samples.push(latency);
    if (this.samples.length > SERVER_SYNC_CONFIG.UI_LATENCY_SAMPLES) {
      this.samples.shift();
    }
    
    // EMA for smooth display
    this.emaLatency = this.emaLatency * (1 - SERVER_SYNC_CONFIG.UI_EMA_WEIGHT) +
                      latency * SERVER_SYNC_CONFIG.UI_EMA_WEIGHT;
  }
  
  getDisplayLatency(): number {
    return Math.round(this.emaLatency);
  }
  
  getMedian(): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  
  reset(): void {
    this.samples = [];
    this.emaLatency = 50;
  }
}

// ===== SINGLETON INSTANCES =====
export const actionRateLimiter = new ActionRateLimiter();
export const uiLatencyTracker = new UILatencyTracker();
