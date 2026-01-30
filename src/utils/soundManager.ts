// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private preloadedBuffers: Map<string, AudioBuffer> = new Map();

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  /**
   * Check if sound is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Pre-warm audio context for minimal latency
   * Call this on first user interaction
   */
  prewarm(): void {
    try {
      const ctx = this.getContext();
      // Create and immediately stop a silent oscillator to warm up
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.001);
    } catch (e) {
      // Silent fail
    }
  }

  // Play a beep/tone sound
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Dice roll sound - multiple quick tones
  playDiceRoll() {
    if (!this.enabled) return;
    
    const rollDuration = 600;
    const numTicks = 8;
    const tickInterval = rollDuration / numTicks;
    
    for (let i = 0; i < numTicks; i++) {
      setTimeout(() => {
        this.playTone(300 + Math.random() * 200, 0.05, 'square', 0.15);
      }, i * tickInterval);
    }
  }

  // Dice result reveal
  playDiceResult(value: number) {
    // Higher value = higher pitch
    const baseFreq = 400 + (value - 1) * 80;
    this.playTone(baseFreq, 0.15, 'sine', 0.25);
    setTimeout(() => {
      this.playTone(baseFreq * 1.25, 0.1, 'sine', 0.2);
    }, 100);
  }

  // Token move sound - hop effect
  playTokenMove() {
    // Quick hop sound
    this.playTone(500, 0.06, 'sine', 0.2);
    setTimeout(() => this.playTone(650, 0.04, 'sine', 0.15), 50);
  }

  // Token step - each step on the board
  playTokenStep() {
    this.playTone(400 + Math.random() * 100, 0.04, 'sine', 0.15);
  }

  // Token enters board (got a 6)
  playTokenEnter() {
    // Triumphant entry sound
    this.playTone(523, 0.1, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100); // E5
    setTimeout(() => this.playTone(784, 0.12, 'sine', 0.35), 200); // G5
    setTimeout(() => this.playTone(1047, 0.15, 'sine', 0.3), 300); // C6
  }

  // Token reaches home - victory arpeggio
  playTokenHome() {
    const notes = [523, 659, 784, 1047, 1319]; // C major arpeggio extended
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'sine', 0.3), i * 80);
    });
    // Add a sparkle effect at the end
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.playTone(1500 + Math.random() * 500, 0.05, 'sine', 0.15), i * 50);
      }
    }, 400);
  }

  // Capture opponent token - dramatic capture sound
  playCapture() {
    if (!this.enabled) return;
    
    // Impact sound
    this.playTone(150, 0.1, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(100, 0.12, 'sawtooth', 0.35), 60);
    
    // Bounce/send-home effect
    setTimeout(() => {
      this.playTone(400, 0.08, 'sine', 0.2);
      setTimeout(() => this.playTone(300, 0.08, 'sine', 0.18), 50);
      setTimeout(() => this.playTone(200, 0.1, 'sine', 0.15), 100);
    }, 150);
    
    // Victory chime
    setTimeout(() => {
      this.playTone(523, 0.1, 'sine', 0.25);
      this.playTone(659, 0.1, 'sine', 0.2);
    }, 300);
  }

  // Win sound - epic victory fanfare
  playWin() {
    const melody = [
      { freq: 523, dur: 0.12 }, // C5
      { freq: 659, dur: 0.12 }, // E5
      { freq: 784, dur: 0.12 }, // G5
      { freq: 1047, dur: 0.2 }, // C6
      { freq: 1319, dur: 0.25 }, // E6
    ];
    
    let time = 0;
    melody.forEach(({ freq, dur }) => {
      setTimeout(() => this.playTone(freq, dur, 'sine', 0.35), time);
      time += dur * 700;
    });

    // Add celebratory sparkles
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          this.playTone(1000 + Math.random() * 1000, 0.06, 'sine', 0.2);
        }, i * 80);
      }
    }, time);

    // Final triumphant chord
    setTimeout(() => {
      this.playTone(523, 0.4, 'sine', 0.25);
      this.playTone(659, 0.4, 'sine', 0.2);
      this.playTone(784, 0.4, 'sine', 0.2);
      this.playTone(1047, 0.4, 'sine', 0.25);
    }, time + 600);
  }

  // Lose sound
  playLose() {
    this.playTone(300, 0.2, 'sine', 0.2);
    setTimeout(() => this.playTone(250, 0.2, 'sine', 0.2), 200);
    setTimeout(() => this.playTone(200, 0.3, 'sine', 0.25), 400);
  }

  // Button click
  playClick() {
    this.playTone(800, 0.05, 'sine', 0.15);
  }

  // Turn change notification
  playTurnChange() {
    this.playTone(440, 0.1, 'sine', 0.15);
  }

  // Error/invalid move
  playError() {
    this.playTone(200, 0.15, 'square', 0.2);
  }

  // Opponent disconnected alert - attention-grabbing warning sound
  playDisconnectAlert() {
    if (!this.enabled) return;
    
    // Descending warning tones
    this.playTone(800, 0.12, 'square', 0.3);
    setTimeout(() => this.playTone(600, 0.12, 'square', 0.28), 120);
    setTimeout(() => this.playTone(400, 0.15, 'square', 0.25), 240);
    
    // Quick alert beeps
    setTimeout(() => {
      this.playTone(700, 0.08, 'square', 0.2);
      setTimeout(() => this.playTone(700, 0.08, 'square', 0.2), 100);
    }, 450);
  }

  // Mines - Gem reveal celebration
  playGemReveal() {
    const notes = [880, 1100, 1320]; // High sparkly tones
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.08, 'sine', 0.2), i * 50);
    });
  }

  // Mines - Bomb explosion
  playBombExplosion() {
    // Low rumble followed by high crash
    this.playTone(80, 0.3, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(150, 0.2, 'square', 0.3), 50);
    setTimeout(() => this.playTone(60, 0.4, 'sawtooth', 0.35), 100);
    setTimeout(() => {
      // White noise-like effect
      for (let i = 0; i < 5; i++) {
        setTimeout(() => this.playTone(100 + Math.random() * 100, 0.05, 'sawtooth', 0.15), i * 30);
      }
    }, 150);
  }

  // Mines - Cash out success
  playCashOut() {
    const melody = [
      { freq: 523, dur: 0.1 },  // C5
      { freq: 659, dur: 0.1 },  // E5
      { freq: 784, dur: 0.1 },  // G5
      { freq: 1047, dur: 0.15 }, // C6
      { freq: 1319, dur: 0.2 }, // E6
    ];
    
    let time = 0;
    melody.forEach(({ freq, dur }) => {
      setTimeout(() => this.playTone(freq, dur, 'sine', 0.25), time);
      time += dur * 600;
    });
  }
}

export const soundManager = new SoundManager();