/**
 * LUDO MICRO-LATENCY UX ENGINE
 * 
 * Creates Ludo King-level instant feel through visual/audio illusions.
 * Does NOT change any game logic - purely perception optimization.
 * 
 * Techniques:
 * 1. Pre-trigger sounds before animation starts
 * 2. Ghost micro-movements before actual moves
 * 3. Opponent presence pulses
 * 4. Syncing indicator for latency masking
 */

import { soundManager } from './soundManager';

// ===== TIMING CONSTANTS =====
export const MICRO_LATENCY = {
  // Pre-trigger timing (sound before visual)
  DICE_SOUND_LEAD_MS: 60,        // Play dice sound 60ms before animation
  TOKEN_SOUND_LEAD_MS: 40,       // Play token sound 40ms before movement
  
  // Ghost movement timing
  GHOST_MOVEMENT_LEAD_MS: 80,    // Start micro-movement 80ms before actual move
  GHOST_MOVEMENT_PIXELS: 2,       // 1-2px subtle movement
  GHOST_MOVEMENT_DURATION_MS: 60, // Quick micro-movement
  
  // Opponent presence pulse
  PRESENCE_PULSE_SCALE: 1.03,    // Subtle 3% scale
  PRESENCE_PULSE_DURATION_MS: 120, // Quick pulse
  PRESENCE_PULSE_INTERVAL_MS: 3000, // Every 3 seconds when opponent is active
  
  // Network latency masking
  LATENCY_THRESHOLD_MS: 120,      // When to consider showing sync indicator
  SYNC_INDICATOR_DELAY_MS: 400,   // Wait 400ms before showing "Syncing..."
  SYNC_INDICATOR_FADE_MS: 200,    // Fade out duration
  
  // Fast-start animation curve
  EASING_FAST_START: 'cubic-bezier(0.25, 0.9, 0.3, 1)',
  
  // Token animation optimizations
  TOKEN_MOVE_DURATION_MS: 180,    // Faster token step animation
  TOKEN_HOP_HEIGHT_PX: 8,         // Hop height for snappy feel
} as const;

// ===== PRE-TRIGGER SOUND CONTROLLER =====
export class PreTriggerSoundController {
  private scheduledSounds: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Pre-schedule dice roll sound to play before animation starts
   */
  preTriggerDiceRoll(onSoundStart?: () => void): void {
    // Clear any existing scheduled sound
    this.clearScheduled('dice');
    
    // Play sound immediately (will be 60ms before animation starts)
    soundManager.playDiceRoll();
    onSoundStart?.();
  }
  
  /**
   * Pre-schedule token move sound
   */
  preTriggerTokenMove(): void {
    this.clearScheduled('token');
    soundManager.playTokenMove();
  }
  
  /**
   * Pre-trigger token step sound (each hop)
   */
  preTriggerTokenStep(): void {
    soundManager.playTokenStep();
  }
  
  /**
   * Clear any scheduled sound
   */
  clearScheduled(key: string): void {
    const existing = this.scheduledSounds.get(key);
    if (existing) {
      clearTimeout(existing);
      this.scheduledSounds.delete(key);
    }
  }
  
  /**
   * Clear all scheduled sounds
   */
  clearAll(): void {
    for (const timeout of this.scheduledSounds.values()) {
      clearTimeout(timeout);
    }
    this.scheduledSounds.clear();
  }
}

// ===== GHOST MOVEMENT CONTROLLER =====
export interface GhostMovementState {
  isActive: boolean;
  offsetX: number;
  offsetY: number;
  tokenId: number | null;
  color: string | null;
}

export class GhostMovementController {
  private state: GhostMovementState = {
    isActive: false,
    offsetX: 0,
    offsetY: 0,
    tokenId: null,
    color: null,
  };
  
  private animationFrame: number | null = null;
  private onUpdate: ((state: GhostMovementState) => void) | null = null;
  
  /**
   * Set callback for state updates
   */
  setOnUpdate(callback: (state: GhostMovementState) => void): void {
    this.onUpdate = callback;
  }
  
  /**
   * Start ghost micro-movement for a token
   * Called ~80ms before actual move animation starts
   */
  startGhostMovement(
    color: string, 
    tokenId: number, 
    direction: { x: number; y: number }
  ): void {
    this.state = {
      isActive: true,
      offsetX: 0,
      offsetY: 0,
      tokenId,
      color,
    };
    
    const startTime = performance.now();
    const targetX = direction.x * MICRO_LATENCY.GHOST_MOVEMENT_PIXELS;
    const targetY = direction.y * MICRO_LATENCY.GHOST_MOVEMENT_PIXELS;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / MICRO_LATENCY.GHOST_MOVEMENT_DURATION_MS, 1);
      
      // Fast-start easing
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.state.offsetX = targetX * eased;
      this.state.offsetY = targetY * eased;
      
      this.onUpdate?.(this.state);
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // Hold at peak briefly
        setTimeout(() => this.endGhostMovement(), 20);
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  /**
   * End ghost movement (actual animation takes over)
   */
  endGhostMovement(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.state = {
      isActive: false,
      offsetX: 0,
      offsetY: 0,
      tokenId: null,
      color: null,
    };
    
    this.onUpdate?.(this.state);
  }
  
  /**
   * Get current ghost state for a specific token
   */
  getGhostOffset(color: string, tokenId: number): { x: number; y: number } | null {
    if (this.state.isActive && this.state.color === color && this.state.tokenId === tokenId) {
      return { x: this.state.offsetX, y: this.state.offsetY };
    }
    return null;
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.endGhostMovement();
    this.onUpdate = null;
  }
}

// ===== OPPONENT PRESENCE PULSE =====
export interface PresencePulseState {
  isActive: boolean;
  scale: number;
  playerColor: string | null;
}

export class OpponentPresencePulse {
  private state: PresencePulseState = {
    isActive: false,
    scale: 1,
    playerColor: null,
  };
  
  private intervalId: NodeJS.Timeout | null = null;
  private animationFrame: number | null = null;
  private onUpdate: ((state: PresencePulseState) => void) | null = null;
  
  /**
   * Set callback for state updates
   */
  setOnUpdate(callback: (state: PresencePulseState) => void): void {
    this.onUpdate = callback;
  }
  
  /**
   * Start periodic presence pulses for opponent
   */
  startPresencePulse(playerColor: string): void {
    this.stopPresencePulse();
    
    this.state.playerColor = playerColor;
    
    // Trigger initial pulse after short delay
    setTimeout(() => this.triggerPulse(), 500);
    
    // Set up interval for periodic pulses
    this.intervalId = setInterval(() => {
      this.triggerPulse();
    }, MICRO_LATENCY.PRESENCE_PULSE_INTERVAL_MS);
  }
  
  /**
   * Trigger a single pulse animation
   */
  private triggerPulse(): void {
    if (!this.state.playerColor) return;
    
    const startTime = performance.now();
    this.state.isActive = true;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / MICRO_LATENCY.PRESENCE_PULSE_DURATION_MS, 1);
      
      // Sine wave for smooth in-out
      const wave = Math.sin(progress * Math.PI);
      this.state.scale = 1 + (MICRO_LATENCY.PRESENCE_PULSE_SCALE - 1) * wave;
      
      this.onUpdate?.(this.state);
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.state.scale = 1;
        this.state.isActive = false;
        this.onUpdate?.(this.state);
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  /**
   * Trigger immediate pulse (e.g., when opponent rolls dice)
   */
  triggerImmediatePulse(): void {
    this.triggerPulse();
  }
  
  /**
   * Stop presence pulses
   */
  stopPresencePulse(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.state = {
      isActive: false,
      scale: 1,
      playerColor: null,
    };
    
    this.onUpdate?.(this.state);
  }
  
  /**
   * Get current pulse scale for player
   */
  getPulseScale(playerColor: string): number {
    if (this.state.playerColor === playerColor) {
      return this.state.scale;
    }
    return 1;
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPresencePulse();
    this.onUpdate = null;
  }
}

// ===== SYNC INDICATOR CONTROLLER =====
export interface SyncIndicatorState {
  isVisible: boolean;
  opacity: number;
  message: string;
}

export class SyncIndicatorController {
  private state: SyncIndicatorState = {
    isVisible: false,
    opacity: 0,
    message: 'Syncing...',
  };
  
  private showTimeout: NodeJS.Timeout | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;
  private onUpdate: ((state: SyncIndicatorState) => void) | null = null;
  private actionStartTime: number | null = null;
  
  /**
   * Set callback for state updates
   */
  setOnUpdate(callback: (state: SyncIndicatorState) => void): void {
    this.onUpdate = callback;
  }
  
  /**
   * Called when an action is sent to server
   */
  actionSent(): void {
    this.actionStartTime = performance.now();
    
    // Clear any existing timeouts
    if (this.showTimeout) clearTimeout(this.showTimeout);
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    
    // Schedule showing indicator after delay
    this.showTimeout = setTimeout(() => {
      // Only show if action still pending
      if (this.actionStartTime !== null) {
        this.showIndicator();
      }
    }, MICRO_LATENCY.SYNC_INDICATOR_DELAY_MS);
  }
  
  /**
   * Called when server response received
   */
  actionConfirmed(): void {
    const latency = this.actionStartTime 
      ? performance.now() - this.actionStartTime 
      : 0;
    
    this.actionStartTime = null;
    
    // Clear show timeout
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    
    // If indicator is visible, fade it out
    if (this.state.isVisible) {
      this.hideIndicator();
    }
    
    return;
  }
  
  /**
   * Show the sync indicator
   */
  private showIndicator(): void {
    this.state = {
      isVisible: true,
      opacity: 1,
      message: 'Syncing...',
    };
    this.onUpdate?.(this.state);
  }
  
  /**
   * Hide the sync indicator with fade
   */
  private hideIndicator(): void {
    // Quick fade out
    const startOpacity = this.state.opacity;
    const startTime = performance.now();
    
    const fadeOut = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / MICRO_LATENCY.SYNC_INDICATOR_FADE_MS, 1);
      
      this.state.opacity = startOpacity * (1 - progress);
      this.onUpdate?.(this.state);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        this.state = {
          isVisible: false,
          opacity: 0,
          message: 'Syncing...',
        };
        this.onUpdate?.(this.state);
      }
    };
    
    requestAnimationFrame(fadeOut);
  }
  
  /**
   * Get current state
   */
  getState(): SyncIndicatorState {
    return { ...this.state };
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    if (this.showTimeout) clearTimeout(this.showTimeout);
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.onUpdate = null;
  }
}

// ===== SINGLETON INSTANCES =====
export const preTriggerSound = new PreTriggerSoundController();
export const ghostMovement = new GhostMovementController();
export const opponentPulse = new OpponentPresencePulse();
export const syncIndicator = new SyncIndicatorController();

// ===== COMBINED MICRO-LATENCY MANAGER =====
export class MicroLatencyManager {
  private preTrigger: PreTriggerSoundController;
  private ghost: GhostMovementController;
  private pulse: OpponentPresencePulse;
  private sync: SyncIndicatorController;
  
  constructor() {
    this.preTrigger = preTriggerSound;
    this.ghost = ghostMovement;
    this.pulse = opponentPulse;
    this.sync = syncIndicator;
  }
  
  /**
   * Pre-trigger dice roll with coordinated effects
   */
  preTriggerDiceRoll(): void {
    // Play sound 60ms before animation
    setTimeout(() => {
      this.preTrigger.preTriggerDiceRoll();
    }, 0); // Immediate - animation will start 60ms later
    
    // Track action for sync indicator
    this.sync.actionSent();
  }
  
  /**
   * Pre-trigger token move with ghost movement
   */
  preTriggerTokenMove(
    color: string, 
    tokenId: number, 
    direction: { x: number; y: number }
  ): void {
    // Start ghost movement
    this.ghost.startGhostMovement(color, tokenId, direction);
    
    // Pre-trigger sound after ghost starts
    setTimeout(() => {
      this.preTrigger.preTriggerTokenMove();
    }, MICRO_LATENCY.TOKEN_SOUND_LEAD_MS);
    
    // Track action for sync indicator
    this.sync.actionSent();
  }
  
  /**
   * Called when server confirms action
   */
  confirmAction(): void {
    this.ghost.endGhostMovement();
    this.sync.actionConfirmed();
  }
  
  /**
   * Start opponent presence pulse
   */
  startOpponentPulse(opponentColor: string): void {
    this.pulse.startPresencePulse(opponentColor);
  }
  
  /**
   * Trigger immediate opponent pulse (e.g., when they roll)
   */
  pulseOpponent(): void {
    this.pulse.triggerImmediatePulse();
  }
  
  /**
   * Stop opponent pulse
   */
  stopOpponentPulse(): void {
    this.pulse.stopPresencePulse();
  }
  
  /**
   * Cleanup all
   */
  destroy(): void {
    this.preTrigger.clearAll();
    this.ghost.destroy();
    this.pulse.destroy();
    this.sync.destroy();
  }
}

// Export singleton manager
export const microLatencyManager = new MicroLatencyManager();
