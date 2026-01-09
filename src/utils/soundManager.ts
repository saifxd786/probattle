// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
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

  // Token move sound
  playTokenMove() {
    this.playTone(600, 0.08, 'sine', 0.2);
  }

  // Token enters board (got a 6)
  playTokenEnter() {
    this.playTone(523, 0.1, 'sine', 0.25); // C5
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.25), 80); // E5
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.3), 160); // G5
  }

  // Token reaches home
  playTokenHome() {
    const notes = [523, 659, 784, 1047]; // C major arpeggio
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.25), i * 100);
    });
  }

  // Capture opponent token
  playCapture() {
    this.playTone(200, 0.1, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(150, 0.15, 'sawtooth', 0.25), 80);
  }

  // Win sound - victory fanfare
  playWin() {
    const melody = [
      { freq: 523, dur: 0.15 }, // C5
      { freq: 659, dur: 0.15 }, // E5
      { freq: 784, dur: 0.15 }, // G5
      { freq: 1047, dur: 0.3 }, // C6
    ];
    
    let time = 0;
    melody.forEach(({ freq, dur }) => {
      setTimeout(() => this.playTone(freq, dur, 'sine', 0.3), time);
      time += dur * 800;
    });
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