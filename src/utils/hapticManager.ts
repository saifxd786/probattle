// Haptic feedback utility for mobile devices
// Uses the Vibration API which is supported on most Android browsers and some iOS browsers

type HapticIntensity = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const vibrationPatterns: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20], // Short-pause-short
  warning: [30, 30, 30], // Three medium pulses
  error: [50, 100, 50, 100, 50], // Long pattern for errors
};

class HapticManager {
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  private vibrate(pattern: number | number[]): void {
    if (this.isSupported) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently fail if vibration not available
      }
    }
  }

  // Basic intensity levels
  light(): void {
    this.vibrate(vibrationPatterns.light);
  }

  medium(): void {
    this.vibrate(vibrationPatterns.medium);
  }

  heavy(): void {
    this.vibrate(vibrationPatterns.heavy);
  }

  // Feedback patterns
  success(): void {
    this.vibrate(vibrationPatterns.success);
  }

  warning(): void {
    this.vibrate(vibrationPatterns.warning);
  }

  error(): void {
    this.vibrate(vibrationPatterns.error);
  }

  // Game-specific haptics
  diceRoll(): void {
    // Quick succession of vibrations simulating dice roll
    this.vibrate([15, 30, 15, 30, 15, 30, 25]);
  }

  diceResult(value: number): void {
    // Stronger vibration for 6
    if (value === 6) {
      this.vibrate([20, 40, 20, 40, 50]);
    } else {
      this.vibrate(30);
    }
  }

  tokenMove(): void {
    this.vibrate(15);
  }

  tokenEnter(): void {
    // Token enters the board
    this.vibrate([15, 20, 25]);
  }

  tokenHome(): void {
    // Token reaches home - celebration pattern
    this.vibrate([20, 30, 20, 30, 20, 30, 40]);
  }

  tokenCapture(): void {
    // Captured opponent's token
    this.vibrate([40, 50, 40]);
  }

  gameWin(): void {
    // Victory celebration
    this.vibrate([30, 50, 30, 50, 30, 100, 50, 100, 50]);
  }

  gameLose(): void {
    // Loss acknowledgment
    this.vibrate([100, 100, 100]);
  }

  buttonTap(): void {
    this.vibrate(8);
  }

  pullToRefresh(): void {
    this.vibrate([10, 20, 10]);
  }

  selection(): void {
    this.vibrate(12);
  }

  // Custom pattern
  custom(pattern: number | number[]): void {
    this.vibrate(pattern);
  }

  // Check if haptics are supported
  isHapticSupported(): boolean {
    return this.isSupported;
  }
}

export const hapticManager = new HapticManager();
