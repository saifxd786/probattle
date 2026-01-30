/**
 * LUDO KING-LEVEL SYNC ENGINE
 * 
 * This module implements production-grade real-time synchronization
 * matching the quality of Ludo King's multiplayer experience.
 * 
 * Key Features:
 * 1. Optimistic UI Updates - Instant visual feedback
 * 2. Delta Compression - Only transmit state changes
 * 3. Predictive Animation - Start animations before confirmation
 * 4. Server-Authoritative State - Database is source of truth
 * 5. Automatic Recovery - Seamless desync recovery
 * 6. Sub-100ms Latency - WebSocket optimizations
 */

import { RealtimeChannel } from '@supabase/supabase-js';

// ===== ESPORTS-GRADE SYNC ENGINE (20ms TARGET) =====
export const SYNC_CONFIG = {
  // Optimistic Update Settings - Faster confirmations
  OPTIMISTIC_TIMEOUT_MS: 1500, // 1.5s rollback timeout
  MAX_PENDING_ACTIONS: 15, // Allow more concurrent actions
  
  // Delta Compression - Minimal overhead
  ENABLE_DELTA_COMPRESSION: true,
  MIN_DELTA_SIZE_BYTES: 30, // Compress more aggressively
  
  // Predictive Animation - Start earlier for perceived speed
  ANIMATION_LEAD_TIME_MS: 20, // Ultra-early animation start
  DICE_ANIMATION_DURATION_MS: 600, // Faster dice
  TOKEN_MOVE_DURATION_MS: 200, // Faster tokens
  
  // State Reconciliation - Higher frequency
  RECONCILE_INTERVAL_MS: 150, // Check state every 150ms (6.6x/second)
  MAX_STATE_AGE_MS: 3000, // Force sync if state older than 3s
  CHECKSUM_BITS: 32, // Fast checksum
  
  // Network Optimization - Minimal batching
  BATCH_WINDOW_MS: 4, // 4ms batch window (~250fps)
  PRIORITY_EVENTS: ['dice_roll', 'dice_rolling', 'token_move', 'token_select', 'game_end', 'turn_complete'] as const,
  
  // Latency Prediction - More samples, faster adaptation
  LATENCY_SAMPLES: 80, // More samples for accuracy
  LATENCY_PREDICTION_WEIGHT: 0.8, // Faster adaptation to changes
  JITTER_COMPENSATION_MS: 10, // Less buffer = faster feel
} as const;

// ===== TYPES =====
export interface PendingAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  optimisticState: any;
  confirmed: boolean;
  retries: number;
}

export interface StateDelta {
  version: number;
  timestamp: number;
  changes: DeltaChange[];
  checksum: string;
}

export interface DeltaChange {
  path: string; // e.g., "players.0.tokens.1.position"
  oldValue: any;
  newValue: any;
}

export interface SyncStats {
  pendingActions: number;
  confirmedActions: number;
  rollbacks: number;
  avgConfirmTime: number;
  lastSyncTime: number;
  stateVersion: number;
}

// ===== FAST CHECKSUM (FNV-1a 32-bit) =====
export function fastChecksum(data: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ===== DELTA COMPRESSION =====
export class DeltaCompressor {
  private lastState: any = null;
  private version = 0;
  
  /**
   * Calculate delta between current and new state
   */
  calculateDelta(newState: any): StateDelta | null {
    if (!this.lastState) {
      this.lastState = JSON.parse(JSON.stringify(newState));
      this.version = 1;
      return null; // First state, no delta
    }
    
    const changes: DeltaChange[] = [];
    this.findChanges('', this.lastState, newState, changes);
    
    if (changes.length === 0) {
      return null; // No changes
    }
    
    this.version++;
    const delta: StateDelta = {
      version: this.version,
      timestamp: Date.now(),
      changes,
      checksum: fastChecksum(JSON.stringify(newState))
    };
    
    this.lastState = JSON.parse(JSON.stringify(newState));
    return delta;
  }
  
  private findChanges(path: string, oldObj: any, newObj: any, changes: DeltaChange[]) {
    // Handle primitives
    if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
      if (oldObj !== newObj) {
        changes.push({ path, oldValue: oldObj, newValue: newObj });
      }
      return;
    }
    
    // Handle null
    if (oldObj === null || newObj === null) {
      if (oldObj !== newObj) {
        changes.push({ path, oldValue: oldObj, newValue: newObj });
      }
      return;
    }
    
    // Handle arrays - compare by index
    if (Array.isArray(oldObj) && Array.isArray(newObj)) {
      const maxLen = Math.max(oldObj.length, newObj.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = path ? `${path}.${i}` : `${i}`;
        if (i >= oldObj.length) {
          changes.push({ path: itemPath, oldValue: undefined, newValue: newObj[i] });
        } else if (i >= newObj.length) {
          changes.push({ path: itemPath, oldValue: oldObj[i], newValue: undefined });
        } else {
          this.findChanges(itemPath, oldObj[i], newObj[i], changes);
        }
      }
      return;
    }
    
    // Handle objects
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;
      if (!(key in oldObj)) {
        changes.push({ path: keyPath, oldValue: undefined, newValue: newObj[key] });
      } else if (!(key in newObj)) {
        changes.push({ path: keyPath, oldValue: oldObj[key], newValue: undefined });
      } else {
        this.findChanges(keyPath, oldObj[key], newObj[key], changes);
      }
    }
  }
  
  /**
   * Apply delta to reconstruct state
   */
  applyDelta(baseState: any, delta: StateDelta): any {
    const newState = JSON.parse(JSON.stringify(baseState));
    
    for (const change of delta.changes) {
      this.setValueAtPath(newState, change.path, change.newValue);
    }
    
    return newState;
  }
  
  private setValueAtPath(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!(key in current)) {
        current[key] = isNaN(Number(parts[i + 1])) ? {} : [];
      }
      current = current[key];
    }
    
    const lastKey = parts[parts.length - 1];
    if (value === undefined) {
      delete current[lastKey];
    } else {
      current[lastKey] = value;
    }
  }
  
  reset() {
    this.lastState = null;
    this.version = 0;
  }
}

// ===== OPTIMISTIC UPDATE MANAGER =====
export class OptimisticUpdateManager {
  private pendingActions: Map<string, PendingAction> = new Map();
  private confirmedCount = 0;
  private rollbackCount = 0;
  private confirmTimes: number[] = [];
  private onRollback: ((action: PendingAction) => void) | null = null;
  
  constructor(onRollback?: (action: PendingAction) => void) {
    this.onRollback = onRollback || null;
  }
  
  /**
   * Register a pending optimistic action
   */
  registerAction(id: string, type: string, payload: any, optimisticState: any): boolean {
    if (this.pendingActions.size >= SYNC_CONFIG.MAX_PENDING_ACTIONS) {
      console.warn('[OptimisticUpdate] Too many pending actions, blocking new action');
      return false;
    }
    
    this.pendingActions.set(id, {
      id,
      type,
      payload,
      timestamp: Date.now(),
      optimisticState,
      confirmed: false,
      retries: 0
    });
    
    // Set timeout for auto-rollback
    setTimeout(() => this.checkTimeout(id), SYNC_CONFIG.OPTIMISTIC_TIMEOUT_MS);
    
    return true;
  }
  
  /**
   * Confirm an action was accepted by server
   */
  confirmAction(id: string): boolean {
    const action = this.pendingActions.get(id);
    if (!action) return false;
    
    action.confirmed = true;
    this.confirmedCount++;
    
    const confirmTime = Date.now() - action.timestamp;
    this.confirmTimes.push(confirmTime);
    if (this.confirmTimes.length > 100) this.confirmTimes.shift();
    
    this.pendingActions.delete(id);
    return true;
  }
  
  /**
   * Check if action timed out and rollback if needed
   */
  private checkTimeout(id: string) {
    const action = this.pendingActions.get(id);
    if (!action || action.confirmed) return;
    
    const elapsed = Date.now() - action.timestamp;
    if (elapsed >= SYNC_CONFIG.OPTIMISTIC_TIMEOUT_MS) {
      console.warn('[OptimisticUpdate] Action timed out, rolling back:', id);
      this.rollbackCount++;
      
      if (this.onRollback) {
        this.onRollback(action);
      }
      
      this.pendingActions.delete(id);
    }
  }
  
  /**
   * Get stats for monitoring
   */
  getStats(): SyncStats {
    const avgConfirmTime = this.confirmTimes.length > 0
      ? this.confirmTimes.reduce((a, b) => a + b, 0) / this.confirmTimes.length
      : 0;
    
    return {
      pendingActions: this.pendingActions.size,
      confirmedActions: this.confirmedCount,
      rollbacks: this.rollbackCount,
      avgConfirmTime: Math.round(avgConfirmTime),
      lastSyncTime: Date.now(),
      stateVersion: 0
    };
  }
  
  /**
   * Check if there are pending actions of a specific type
   */
  hasPendingAction(type: string): boolean {
    for (const action of this.pendingActions.values()) {
      if (action.type === type && !action.confirmed) return true;
    }
    return false;
  }
  
  /**
   * Get all pending actions
   */
  getPendingActions(): PendingAction[] {
    return Array.from(this.pendingActions.values());
  }
  
  /**
   * Clear all pending actions
   */
  clear() {
    this.pendingActions.clear();
  }
}

// ===== LATENCY PREDICTOR =====
export class LatencyPredictor {
  private samples: number[] = [];
  private emaLatency = 50; // Start with 50ms estimate
  
  addSample(latency: number) {
    this.samples.push(latency);
    if (this.samples.length > SYNC_CONFIG.LATENCY_SAMPLES) {
      this.samples.shift();
    }
    
    // Update EMA
    this.emaLatency = this.emaLatency * (1 - SYNC_CONFIG.LATENCY_PREDICTION_WEIGHT) +
                      latency * SYNC_CONFIG.LATENCY_PREDICTION_WEIGHT;
  }
  
  /**
   * Predict the next RTT (Round Trip Time)
   */
  predictRTT(): number {
    if (this.samples.length < 3) {
      return Math.round(this.emaLatency + SYNC_CONFIG.JITTER_COMPENSATION_MS);
    }
    
    // Use EMA plus jitter compensation
    const jitter = this.calculateJitter();
    return Math.round(this.emaLatency + jitter + SYNC_CONFIG.JITTER_COMPENSATION_MS);
  }
  
  /**
   * Calculate current jitter (variance in latency)
   */
  private calculateJitter(): number {
    if (this.samples.length < 2) return 0;
    
    const recent = this.samples.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Get the time to start an animation before the action completes
   */
  getAnimationLeadTime(): number {
    const predictedRTT = this.predictRTT();
    // Start animation predictedRTT/2 ms early (half round trip)
    return Math.max(SYNC_CONFIG.ANIMATION_LEAD_TIME_MS, predictedRTT / 2);
  }
  
  /**
   * Get current latency stats
   */
  getStats(): { current: number; predicted: number; jitter: number; samples: number } {
    const current = this.samples.length > 0 ? this.samples[this.samples.length - 1] : 0;
    return {
      current,
      predicted: this.predictRTT(),
      jitter: Math.round(this.calculateJitter()),
      samples: this.samples.length
    };
  }
  
  clear() {
    this.samples = [];
    this.emaLatency = 50;
  }
}

// ===== ACTION BATCHER =====
export class ActionBatcher {
  private actionQueue: Array<{ event: string; payload: any; priority: number }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private sendFn: (actions: Array<{ event: string; payload: any }>) => void;
  
  constructor(sendFn: (actions: Array<{ event: string; payload: any }>) => void) {
    this.sendFn = sendFn;
  }
  
  /**
   * Queue an action for batched sending
   */
  enqueue(event: string, payload: any) {
    const priority = SYNC_CONFIG.PRIORITY_EVENTS.includes(event as any) ? 10 : 1;
    
    // Priority events send immediately
    if (priority === 10) {
      this.flush();
      this.sendFn([{ event, payload }]);
      return;
    }
    
    this.actionQueue.push({ event, payload, priority });
    
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), SYNC_CONFIG.BATCH_WINDOW_MS);
    }
  }
  
  /**
   * Flush all queued actions
   */
  flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.actionQueue.length === 0) return;
    
    // Sort by priority (higher first)
    this.actionQueue.sort((a, b) => b.priority - a.priority);
    
    // Send batched
    this.sendFn(this.actionQueue.map(({ event, payload }) => ({ event, payload })));
    this.actionQueue = [];
  }
  
  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.actionQueue = [];
  }
}

// ===== STATE RECONCILER =====
export class StateReconciler {
  private localChecksum: string = '';
  private remoteChecksum: string = '';
  private lastReconcileTime = 0;
  private mismatchCount = 0;
  private onDesync: (() => void) | null = null;
  
  constructor(onDesync?: () => void) {
    this.onDesync = onDesync || null;
  }
  
  /**
   * Update local state checksum
   */
  updateLocalChecksum(state: any) {
    this.localChecksum = fastChecksum(JSON.stringify(state));
  }
  
  /**
   * Compare with remote checksum
   */
  compareWithRemote(remoteChecksum: string): boolean {
    this.remoteChecksum = remoteChecksum;
    
    if (this.localChecksum === remoteChecksum) {
      this.mismatchCount = 0;
      this.lastReconcileTime = Date.now();
      return true;
    }
    
    this.mismatchCount++;
    console.warn(`[StateReconciler] Checksum mismatch #${this.mismatchCount}:`, {
      local: this.localChecksum,
      remote: remoteChecksum
    });
    
    // Trigger desync recovery after 2 consecutive mismatches
    if (this.mismatchCount >= 2 && this.onDesync) {
      this.onDesync();
      this.mismatchCount = 0;
    }
    
    return false;
  }
  
  /**
   * Check if we need to force sync due to age
   */
  needsForceSync(): boolean {
    return Date.now() - this.lastReconcileTime > SYNC_CONFIG.MAX_STATE_AGE_MS;
  }
  
  getLocalChecksum(): string {
    return this.localChecksum;
  }
  
  reset() {
    this.localChecksum = '';
    this.remoteChecksum = '';
    this.mismatchCount = 0;
    this.lastReconcileTime = 0;
  }
}

// ===== MAIN SYNC ENGINE =====
export class LudoSyncEngine {
  private deltaCompressor = new DeltaCompressor();
  private optimisticManager: OptimisticUpdateManager;
  private latencyPredictor = new LatencyPredictor();
  private stateReconciler: StateReconciler;
  private actionBatcher: ActionBatcher;
  
  private channel: RealtimeChannel | null = null;
  private userId: string = '';
  private isActive = false;
  
  // Callbacks
  private onStateUpdate: ((state: any) => void) | null = null;
  private onRollback: ((previousState: any) => void) | null = null;
  private onDesync: (() => void) | null = null;
  
  constructor() {
    this.optimisticManager = new OptimisticUpdateManager((action) => {
      if (this.onRollback) {
        this.onRollback(action.optimisticState);
      }
    });
    
    this.stateReconciler = new StateReconciler(() => {
      if (this.onDesync) {
        this.onDesync();
      }
    });
    
    this.actionBatcher = new ActionBatcher((actions) => {
      this.sendBatchedActions(actions);
    });
  }
  
  /**
   * Initialize the sync engine with a channel
   */
  initialize(
    channel: RealtimeChannel,
    userId: string,
    callbacks: {
      onStateUpdate?: (state: any) => void;
      onRollback?: (previousState: any) => void;
      onDesync?: () => void;
    }
  ) {
    this.channel = channel;
    this.userId = userId;
    this.isActive = true;
    
    this.onStateUpdate = callbacks.onStateUpdate || null;
    this.onRollback = callbacks.onRollback || null;
    this.onDesync = callbacks.onDesync || null;
    
    console.log('[LudoSyncEngine] Initialized for user:', userId);
  }
  
  /**
   * Send an action with optimistic update
   */
  sendAction(
    actionId: string,
    type: string,
    payload: any,
    optimisticState: any
  ): boolean {
    if (!this.isActive || !this.channel) {
      console.warn('[LudoSyncEngine] Not active, cannot send action');
      return false;
    }
    
    // Register for optimistic update tracking
    const registered = this.optimisticManager.registerAction(
      actionId,
      type,
      payload,
      optimisticState
    );
    
    if (!registered) {
      return false;
    }
    
    // Queue for batched sending
    this.actionBatcher.enqueue(type, {
      ...payload,
      actionId,
      senderId: this.userId,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * Send priority action immediately (bypass batching)
   */
  sendPriorityAction(type: string, payload: any) {
    if (!this.channel) return;
    
    this.actionBatcher.flush(); // Flush any pending
    
    this.channel.send({
      type: 'broadcast',
      event: type,
      payload: {
        ...payload,
        senderId: this.userId,
        timestamp: Date.now()
      }
    }).catch(err => {
      console.error('[LudoSyncEngine] Priority action failed:', err);
    });
  }
  
  /**
   * Internal: send batched actions
   */
  private async sendBatchedActions(actions: Array<{ event: string; payload: any }>) {
    if (!this.channel) return;
    
    for (const { event, payload } of actions) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event,
          payload
        });
      } catch (err) {
        console.error('[LudoSyncEngine] Failed to send action:', event, err);
      }
    }
  }
  
  /**
   * Confirm an action was received by opponent
   */
  confirmAction(actionId: string) {
    this.optimisticManager.confirmAction(actionId);
  }
  
  /**
   * Record a latency sample
   */
  recordLatency(latency: number) {
    this.latencyPredictor.addSample(latency);
  }
  
  /**
   * Update local state and calculate delta
   */
  updateState(newState: any) {
    const delta = this.deltaCompressor.calculateDelta(newState);
    this.stateReconciler.updateLocalChecksum(newState);
    return delta;
  }
  
  /**
   * Compare checksums for sync verification
   */
  verifySync(remoteChecksum: string): boolean {
    return this.stateReconciler.compareWithRemote(remoteChecksum);
  }
  
  /**
   * Get current sync statistics
   */
  getStats(): {
    optimistic: SyncStats;
    latency: { current: number; predicted: number; jitter: number; samples: number };
    checksum: string;
  } {
    return {
      optimistic: this.optimisticManager.getStats(),
      latency: this.latencyPredictor.getStats(),
      checksum: this.stateReconciler.getLocalChecksum()
    };
  }
  
  /**
   * Get predicted animation lead time
   */
  getAnimationLeadTime(): number {
    return this.latencyPredictor.getAnimationLeadTime();
  }
  
  /**
   * Check if we need to force sync
   */
  needsForceSync(): boolean {
    return this.stateReconciler.needsForceSync();
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.isActive = false;
    this.actionBatcher.clear();
    this.optimisticManager.clear();
    this.deltaCompressor.reset();
    this.stateReconciler.reset();
    this.latencyPredictor.clear();
    this.channel = null;
    console.log('[LudoSyncEngine] Destroyed');
  }
}

// ===== SINGLETON INSTANCE =====
export const ludoSyncEngine = new LudoSyncEngine();

// ===== UTILITY: Generate short action ID =====
let actionCounter = 0;
export function generateActionId(): string {
  actionCounter = (actionCounter + 1) % 1000000;
  return `${Date.now().toString(36)}-${actionCounter.toString(36)}`;
}
