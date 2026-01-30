/**
 * LUDO PREDICTIVE ANIMATOR
 * 
 * Handles predictive animations for Ludo King-level responsiveness.
 * Animations start before server confirmation for instant feedback.
 * 
 * Features:
 * 1. Dice roll prediction - Start animation immediately
 * 2. Token move prediction - Animate while waiting for confirmation
 * 3. Turn change prediction - Smooth UI transitions
 * 4. Rollback animations - Graceful error recovery
 */

export interface AnimationState {
  diceRolling: boolean;
  diceValue: number | null;
  pendingDiceValue: number | null; // Value we're animating to
  tokenMoving: boolean;
  movingToken: { color: string; tokenId: number } | null;
  pendingPosition: number | null;
  turnChanging: boolean;
  pendingTurn: number | null;
}

export interface AnimationCallbacks {
  onDiceRollStart: () => void;
  onDiceRollComplete: (value: number) => void;
  onTokenMoveStart: (color: string, tokenId: number) => void;
  onTokenMoveComplete: (color: string, tokenId: number, position: number) => void;
  onTurnChange: (turn: number) => void;
  onRollback: (type: 'dice' | 'token' | 'turn', originalState: any) => void;
}

// Animation timing constants (matching Ludo King feel)
export const ANIMATION_TIMING = {
  DICE_ROLL_MIN_DURATION: 600, // Minimum dice animation
  DICE_ROLL_MAX_DURATION: 1000, // Maximum dice animation
  TOKEN_MOVE_PER_STEP: 80, // ms per step moved
  TOKEN_MOVE_MIN: 200, // Minimum token animation
  TOKEN_MOVE_MAX: 600, // Maximum token animation
  TURN_CHANGE_DELAY: 150, // Delay before showing turn change
  CAPTURE_ANIMATION: 400, // Capture celebration
  HOME_ANIMATION: 500, // Token reaching home celebration
  ROLLBACK_DURATION: 200, // Quick rollback animation
} as const;

export class LudoPredictiveAnimator {
  private state: AnimationState = {
    diceRolling: false,
    diceValue: null,
    pendingDiceValue: null,
    tokenMoving: false,
    movingToken: null,
    pendingPosition: null,
    turnChanging: false,
    pendingTurn: null,
  };
  
  private callbacks: AnimationCallbacks | null = null;
  private rollbackQueue: Array<{ type: string; state: any; timeout: NodeJS.Timeout }> = [];
  
  /**
   * Initialize with callbacks
   */
  initialize(callbacks: AnimationCallbacks) {
    this.callbacks = callbacks;
  }
  
  /**
   * Start dice roll animation immediately (before server confirmation)
   * Returns the predicted final value for optimistic update
   */
  startDiceRoll(): number {
    const predictedValue = Math.floor(Math.random() * 6) + 1;
    
    this.state.diceRolling = true;
    this.state.pendingDiceValue = predictedValue;
    
    if (this.callbacks) {
      this.callbacks.onDiceRollStart();
    }
    
    // Set rollback timeout
    const timeout = setTimeout(() => {
      this.rollbackDice();
    }, ANIMATION_TIMING.DICE_ROLL_MAX_DURATION + 2000);
    
    this.rollbackQueue.push({
      type: 'dice',
      state: { diceValue: this.state.diceValue },
      timeout
    });
    
    return predictedValue;
  }
  
  /**
   * Confirm dice roll with actual server value
   */
  confirmDiceRoll(actualValue: number): boolean {
    // Clear rollback timeout
    const rollbackIndex = this.rollbackQueue.findIndex(r => r.type === 'dice');
    if (rollbackIndex >= 0) {
      clearTimeout(this.rollbackQueue[rollbackIndex].timeout);
      this.rollbackQueue.splice(rollbackIndex, 1);
    }
    
    // Check if prediction was correct
    const wasCorrect = this.state.pendingDiceValue === actualValue;
    
    this.state.diceValue = actualValue;
    this.state.diceRolling = false;
    this.state.pendingDiceValue = null;
    
    if (this.callbacks) {
      this.callbacks.onDiceRollComplete(actualValue);
    }
    
    return wasCorrect;
  }
  
  /**
   * Rollback dice animation on timeout/error
   */
  private rollbackDice() {
    if (!this.state.diceRolling) return;
    
    const originalState = this.rollbackQueue.find(r => r.type === 'dice')?.state;
    
    this.state.diceRolling = false;
    this.state.pendingDiceValue = null;
    
    if (this.callbacks && originalState) {
      this.callbacks.onRollback('dice', originalState);
    }
  }
  
  /**
   * Start token move animation immediately
   */
  startTokenMove(color: string, tokenId: number, fromPosition: number, toPosition: number): number {
    this.state.tokenMoving = true;
    this.state.movingToken = { color, tokenId };
    this.state.pendingPosition = toPosition;
    
    if (this.callbacks) {
      this.callbacks.onTokenMoveStart(color, tokenId);
    }
    
    // Calculate animation duration based on distance
    const steps = Math.abs(toPosition - fromPosition);
    const duration = Math.min(
      Math.max(steps * ANIMATION_TIMING.TOKEN_MOVE_PER_STEP, ANIMATION_TIMING.TOKEN_MOVE_MIN),
      ANIMATION_TIMING.TOKEN_MOVE_MAX
    );
    
    // Set rollback timeout
    const timeout = setTimeout(() => {
      this.rollbackTokenMove(color, tokenId, fromPosition);
    }, duration + 2000);
    
    this.rollbackQueue.push({
      type: `token_${color}_${tokenId}`,
      state: { position: fromPosition },
      timeout
    });
    
    return duration;
  }
  
  /**
   * Confirm token move with actual server position
   */
  confirmTokenMove(color: string, tokenId: number, actualPosition: number): boolean {
    const rollbackKey = `token_${color}_${tokenId}`;
    const rollbackIndex = this.rollbackQueue.findIndex(r => r.type === rollbackKey);
    
    if (rollbackIndex >= 0) {
      clearTimeout(this.rollbackQueue[rollbackIndex].timeout);
      this.rollbackQueue.splice(rollbackIndex, 1);
    }
    
    const wasCorrect = this.state.pendingPosition === actualPosition;
    
    this.state.tokenMoving = false;
    this.state.movingToken = null;
    this.state.pendingPosition = null;
    
    if (this.callbacks) {
      this.callbacks.onTokenMoveComplete(color, tokenId, actualPosition);
    }
    
    return wasCorrect;
  }
  
  /**
   * Rollback token move
   */
  private rollbackTokenMove(color: string, tokenId: number, originalPosition: number) {
    if (!this.state.tokenMoving) return;
    if (this.state.movingToken?.color !== color || this.state.movingToken?.tokenId !== tokenId) return;
    
    this.state.tokenMoving = false;
    this.state.movingToken = null;
    this.state.pendingPosition = null;
    
    if (this.callbacks) {
      this.callbacks.onRollback('token', { color, tokenId, position: originalPosition });
    }
  }
  
  /**
   * Start turn change animation
   */
  startTurnChange(newTurn: number) {
    this.state.turnChanging = true;
    this.state.pendingTurn = newTurn;
    
    // Auto-complete after delay
    setTimeout(() => {
      this.confirmTurnChange(newTurn);
    }, ANIMATION_TIMING.TURN_CHANGE_DELAY);
  }
  
  /**
   * Confirm turn change
   */
  confirmTurnChange(actualTurn: number) {
    this.state.turnChanging = false;
    this.state.pendingTurn = null;
    
    if (this.callbacks) {
      this.callbacks.onTurnChange(actualTurn);
    }
  }
  
  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return { ...this.state };
  }
  
  /**
   * Check if any animation is in progress
   */
  isAnimating(): boolean {
    return this.state.diceRolling || this.state.tokenMoving || this.state.turnChanging;
  }
  
  /**
   * Clear all animations and rollbacks
   */
  clear() {
    // Clear all pending rollbacks
    for (const rollback of this.rollbackQueue) {
      clearTimeout(rollback.timeout);
    }
    this.rollbackQueue = [];
    
    // Reset state
    this.state = {
      diceRolling: false,
      diceValue: null,
      pendingDiceValue: null,
      tokenMoving: false,
      movingToken: null,
      pendingPosition: null,
      turnChanging: false,
      pendingTurn: null,
    };
  }
  
  /**
   * Destroy and cleanup
   */
  destroy() {
    this.clear();
    this.callbacks = null;
  }
}

// ===== EASING FUNCTIONS FOR SMOOTH ANIMATIONS =====
export const EASING = {
  // Standard easing
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Bounce for dice
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  
  // Elastic for captures
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  
  // Spring for token movement
  spring: (t: number) => {
    return 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6);
  }
};

// ===== ANIMATION FRAME HELPER =====
export function animateValue(
  from: number,
  to: number,
  duration: number,
  easing: (t: number) => number,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): () => void {
  const startTime = performance.now();
  let animationFrame: number;
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    const currentValue = from + (to - from) * easedProgress;
    
    onUpdate(currentValue);
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  };
  
  animationFrame = requestAnimationFrame(animate);
  
  // Return cancel function
  return () => cancelAnimationFrame(animationFrame);
}

// ===== SINGLETON INSTANCE =====
export const ludoPredictiveAnimator = new LudoPredictiveAnimator();
