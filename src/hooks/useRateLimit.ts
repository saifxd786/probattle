import { useState, useCallback, useEffect, useRef } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  lockoutMs: number; // Lockout duration after max attempts
}

const defaultConfig: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minute
  lockoutMs: 300000, // 5 minutes lockout
};

interface RateLimitState {
  attempts: number;
  firstAttemptTime: number;
  lockedUntil: number | null;
}

// Store rate limit state per key (e.g., 'login', 'forgot-password')
const rateLimitStore: Record<string, RateLimitState> = {};

export const useRateLimit = (key: string, config: Partial<RateLimitConfig> = {}) => {
  const [, setUpdateTrigger] = useState(0);
  const tickIntervalRef = useRef<number | null>(null);
  const finalConfig = { ...defaultConfig, ...config };

  const getState = useCallback((): RateLimitState => {
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        attempts: 0,
        firstAttemptTime: 0,
        lockedUntil: null,
      };
    }
    return rateLimitStore[key];
  }, [key]);

  // Read current lock target during render so effects can react to changes.
  const lockedUntil = getState().lockedUntil;

  const isLocked = useCallback((): boolean => {
    const state = getState();
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      return true;
    }
    // Reset if lockout expired
    if (state.lockedUntil && Date.now() >= state.lockedUntil) {
      state.lockedUntil = null;
      state.attempts = 0;
      state.firstAttemptTime = 0;
    }
    return false;
  }, [getState]);

  const getRemainingLockoutTime = useCallback((): number => {
    const state = getState();
    if (state.lockedUntil && Date.now() < state.lockedUntil) {
      return Math.ceil((state.lockedUntil - Date.now()) / 1000);
    }
    return 0;
  }, [getState]);

  const getRemainingAttempts = useCallback((): number => {
    const state = getState();
    if (isLocked()) return 0;
    
    // Reset if window expired
    if (state.firstAttemptTime && Date.now() - state.firstAttemptTime > finalConfig.windowMs) {
      state.attempts = 0;
      state.firstAttemptTime = 0;
    }
    
    return Math.max(0, finalConfig.maxAttempts - state.attempts);
  }, [getState, isLocked, finalConfig.maxAttempts, finalConfig.windowMs]);

  const recordAttempt = useCallback((): boolean => {
    const state = getState();
    
    // Check if locked
    if (isLocked()) {
      setUpdateTrigger(t => t + 1);
      return false;
    }

    // Reset if window expired
    if (state.firstAttemptTime && Date.now() - state.firstAttemptTime > finalConfig.windowMs) {
      state.attempts = 0;
      state.firstAttemptTime = 0;
    }

    // Record attempt
    if (state.attempts === 0) {
      state.firstAttemptTime = Date.now();
    }
    state.attempts++;

    // Check if should lock
    if (state.attempts >= finalConfig.maxAttempts) {
      state.lockedUntil = Date.now() + finalConfig.lockoutMs;
      setUpdateTrigger(t => t + 1);
      return false;
    }

    setUpdateTrigger(t => t + 1);
    return true;
  }, [getState, isLocked, finalConfig.maxAttempts, finalConfig.windowMs, finalConfig.lockoutMs]);

  const resetAttempts = useCallback(() => {
    const state = getState();
    state.attempts = 0;
    state.firstAttemptTime = 0;
    state.lockedUntil = null;
    setUpdateTrigger(t => t + 1);
  }, [getState]);

  // Auto-tick while locked so UI countdown updates and unlocks automatically
  useEffect(() => {
    // No lock active → ensure no interval
    if (!lockedUntil || Date.now() >= lockedUntil) {
      if (tickIntervalRef.current !== null) {
        window.clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      return;
    }

    // Lock active → tick every second
    const tick = () => {
      // This will also reset internal state when lock expires
      const stillLocked = isLocked();
      setUpdateTrigger((t) => t + 1);

      // Stop ticking once unlocked
      if (!stillLocked && tickIntervalRef.current !== null) {
        window.clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };

    tick();

    tickIntervalRef.current = window.setInterval(tick, 1000);
    return () => {
      if (tickIntervalRef.current !== null) {
        window.clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [lockedUntil, isLocked]);

  return {
    isLocked: isLocked(),
    remainingLockoutTime: getRemainingLockoutTime(),
    remainingAttempts: getRemainingAttempts(),
    recordAttempt,
    resetAttempts,
  };
};
