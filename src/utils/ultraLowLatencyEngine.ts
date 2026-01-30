/**
 * ULTRA-LOW LATENCY ENGINE (Sub-20ms Target)
 * 
 * Professional esports-grade network optimization for real-time multiplayer.
 * 
 * Key Features:
 * 1. High-precision timing with performance.now()
 * 2. Adaptive ping prediction using Kalman filter
 * 3. Connection pre-warming and keep-alive
 * 4. Jitter buffer for smooth gameplay
 * 5. Network quality prediction
 * 6. Fast-path message routing
 */

// ===== ULTRA-LOW LATENCY CONFIGURATION =====
export const ULTRA_CONFIG = {
  // Timing (using performance.now() for microsecond precision)
  PING_INTERVAL_ULTRA: 80, // 80ms pings for sub-20ms tracking
  PING_BURST_COUNT: 3, // Send 3 pings in burst for better sampling
  PING_BURST_INTERVAL: 10, // 10ms between burst pings
  
  // Prediction
  KALMAN_PROCESS_NOISE: 0.01,
  KALMAN_MEASUREMENT_NOISE: 0.1,
  PREDICTION_SAMPLES: 100,
  
  // Jitter Buffer
  JITTER_BUFFER_SIZE: 5, // Buffer 5 samples for smoothing
  JITTER_MAX_MS: 50, // Max acceptable jitter
  
  // Connection
  KEEP_ALIVE_INTERVAL: 5000, // Send keep-alive every 5s
  CONNECTION_WARMUP_PINGS: 5, // Send 5 warmup pings on connect
  WARMUP_INTERVAL: 20, // 20ms between warmup pings
  
  // Fast Path
  PRIORITY_EVENTS: new Set(['dice_roll', 'dice_rolling', 'token_move', 'token_select', 'pong', 'ping']),
} as const;

// ===== HIGH-PRECISION TIMER =====
export class HighPrecisionTimer {
  private startTime: number = 0;
  
  start(): void {
    this.startTime = performance.now();
  }
  
  elapsed(): number {
    return performance.now() - this.startTime;
  }
  
  static now(): number {
    return performance.now();
  }
  
  static timestamp(): number {
    // Combine Date.now() with performance fraction for higher precision
    return Date.now() + (performance.now() % 1);
  }
}

// ===== KALMAN FILTER FOR LATENCY PREDICTION =====
export class KalmanLatencyPredictor {
  private estimate: number = 50; // Initial estimate 50ms
  private errorCovariance: number = 1;
  private processNoise: number = ULTRA_CONFIG.KALMAN_PROCESS_NOISE;
  private measurementNoise: number = ULTRA_CONFIG.KALMAN_MEASUREMENT_NOISE;
  private samples: number[] = [];
  private jitterBuffer: number[] = [];
  
  /**
   * Update the filter with a new measurement
   */
  update(measurement: number): number {
    // Predict step
    const predictedEstimate = this.estimate;
    const predictedErrorCovariance = this.errorCovariance + this.processNoise;
    
    // Update step (Kalman gain calculation)
    const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + this.measurementNoise);
    
    // Update estimate
    this.estimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
    this.errorCovariance = (1 - kalmanGain) * predictedErrorCovariance;
    
    // Store sample for statistics
    this.samples.push(measurement);
    if (this.samples.length > ULTRA_CONFIG.PREDICTION_SAMPLES) {
      this.samples.shift();
    }
    
    // Update jitter buffer
    this.jitterBuffer.push(measurement);
    if (this.jitterBuffer.length > ULTRA_CONFIG.JITTER_BUFFER_SIZE) {
      this.jitterBuffer.shift();
    }
    
    return this.estimate;
  }
  
  /**
   * Predict the next latency value
   */
  predict(): number {
    return Math.round(this.estimate);
  }
  
  /**
   * Get smoothed latency (for display)
   */
  getSmoothedLatency(): number {
    if (this.jitterBuffer.length === 0) return this.estimate;
    
    // Use median of jitter buffer for stability
    const sorted = [...this.jitterBuffer].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  
  /**
   * Calculate current jitter
   */
  getJitter(): number {
    if (this.samples.length < 2) return 0;
    
    const recent = this.samples.slice(-20);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    
    return Math.round(Math.sqrt(variance));
  }
  
  /**
   * Get prediction confidence (0-1)
   */
  getConfidence(): number {
    // Lower error covariance = higher confidence
    return Math.max(0, Math.min(1, 1 - this.errorCovariance));
  }
  
  /**
   * Get comprehensive stats
   */
  getStats(): {
    predicted: number;
    smoothed: number;
    jitter: number;
    confidence: number;
    min: number;
    max: number;
    samples: number;
  } {
    const sorted = [...this.samples].sort((a, b) => a - b);
    return {
      predicted: this.predict(),
      smoothed: this.getSmoothedLatency(),
      jitter: this.getJitter(),
      confidence: this.getConfidence(),
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      samples: this.samples.length,
    };
  }
  
  reset(): void {
    this.estimate = 50;
    this.errorCovariance = 1;
    this.samples = [];
    this.jitterBuffer = [];
  }
}

// ===== NETWORK QUALITY ANALYZER =====
export type NetworkGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export class NetworkQualityAnalyzer {
  private predictor = new KalmanLatencyPredictor();
  private packetLossCount = 0;
  private totalPackets = 0;
  private lastAnalysis: { grade: NetworkGrade; score: number } = { grade: 'B', score: 70 };
  
  /**
   * Record a successful ping
   */
  recordPing(latency: number): void {
    this.predictor.update(latency);
    this.totalPackets++;
  }
  
  /**
   * Record a lost packet
   */
  recordLoss(): void {
    this.packetLossCount++;
    this.totalPackets++;
  }
  
  /**
   * Get packet loss percentage
   */
  getPacketLoss(): number {
    if (this.totalPackets === 0) return 0;
    return (this.packetLossCount / this.totalPackets) * 100;
  }
  
  /**
   * Analyze network quality and return grade
   */
  analyze(): { grade: NetworkGrade; score: number; details: string } {
    const stats = this.predictor.getStats();
    const packetLoss = this.getPacketLoss();
    
    // Calculate score (0-100)
    let score = 100;
    
    // Latency penalty (target: 20ms)
    if (stats.smoothed <= 20) {
      score -= 0; // Perfect
    } else if (stats.smoothed <= 40) {
      score -= (stats.smoothed - 20) * 0.5; // -0.5 per ms over 20
    } else if (stats.smoothed <= 80) {
      score -= 10 + (stats.smoothed - 40) * 0.5;
    } else if (stats.smoothed <= 150) {
      score -= 30 + (stats.smoothed - 80) * 0.4;
    } else {
      score -= 60 + (stats.smoothed - 150) * 0.2;
    }
    
    // Jitter penalty
    score -= stats.jitter * 0.5;
    
    // Packet loss penalty (severe)
    score -= packetLoss * 5;
    
    score = Math.max(0, Math.min(100, score));
    
    // Determine grade
    let grade: NetworkGrade;
    let details: string;
    
    if (score >= 95) {
      grade = 'S';
      details = 'Esports-grade connection';
    } else if (score >= 85) {
      grade = 'A';
      details = 'Excellent connection';
    } else if (score >= 70) {
      grade = 'B';
      details = 'Good connection';
    } else if (score >= 55) {
      grade = 'C';
      details = 'Fair connection';
    } else if (score >= 40) {
      grade = 'D';
      details = 'Poor connection';
    } else {
      grade = 'F';
      details = 'Unstable connection';
    }
    
    this.lastAnalysis = { grade, score };
    return { grade, score: Math.round(score), details };
  }
  
  /**
   * Get predicted latency
   */
  getPredictedLatency(): number {
    return this.predictor.predict();
  }
  
  /**
   * Get smoothed latency for display
   */
  getDisplayLatency(): number {
    return this.predictor.getSmoothedLatency();
  }
  
  /**
   * Get full stats
   */
  getStats() {
    return {
      ...this.predictor.getStats(),
      packetLoss: this.getPacketLoss(),
      grade: this.lastAnalysis.grade,
      score: this.lastAnalysis.score,
    };
  }
  
  reset(): void {
    this.predictor.reset();
    this.packetLossCount = 0;
    this.totalPackets = 0;
  }
}

// ===== CONNECTION WARMER =====
export class ConnectionWarmer {
  private warmupComplete = false;
  private warmupLatencies: number[] = [];
  
  /**
   * Perform connection warmup (send burst of pings)
   */
  async warmup(sendPing: () => Promise<number>): Promise<{ avgLatency: number; ready: boolean }> {
    this.warmupLatencies = [];
    
    for (let i = 0; i < ULTRA_CONFIG.CONNECTION_WARMUP_PINGS; i++) {
      try {
        const latency = await sendPing();
        this.warmupLatencies.push(latency);
        
        if (i < ULTRA_CONFIG.CONNECTION_WARMUP_PINGS - 1) {
          await new Promise(r => setTimeout(r, ULTRA_CONFIG.WARMUP_INTERVAL));
        }
      } catch {
        // Ignore warmup failures
      }
    }
    
    this.warmupComplete = true;
    
    const avgLatency = this.warmupLatencies.length > 0
      ? this.warmupLatencies.reduce((a, b) => a + b, 0) / this.warmupLatencies.length
      : 50;
    
    return { avgLatency: Math.round(avgLatency), ready: true };
  }
  
  isReady(): boolean {
    return this.warmupComplete;
  }
  
  getWarmupStats(): { latencies: number[]; avg: number } {
    const avg = this.warmupLatencies.length > 0
      ? this.warmupLatencies.reduce((a, b) => a + b, 0) / this.warmupLatencies.length
      : 0;
    return { latencies: [...this.warmupLatencies], avg };
  }
  
  reset(): void {
    this.warmupComplete = false;
    this.warmupLatencies = [];
  }
}

// ===== FAST-PATH MESSAGE ROUTER =====
export class FastPathRouter {
  private priorityQueue: Array<{ event: string; payload: any; timestamp: number }> = [];
  private normalQueue: Array<{ event: string; payload: any; timestamp: number }> = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private sendFn: ((event: string, payload: any) => void) | null = null;
  
  /**
   * Initialize with send function
   */
  initialize(sendFn: (event: string, payload: any) => void): void {
    this.sendFn = sendFn;
    this.startProcessing();
  }
  
  /**
   * Route a message (priority vs normal path)
   */
  route(event: string, payload: any): void {
    const message = { event, payload, timestamp: HighPrecisionTimer.now() };
    
    if (ULTRA_CONFIG.PRIORITY_EVENTS.has(event)) {
      // Fast path - send immediately
      this.sendImmediate(event, payload);
    } else {
      // Normal path - queue for batching
      this.normalQueue.push(message);
    }
  }
  
  /**
   * Send immediately (bypass queue)
   */
  private sendImmediate(event: string, payload: any): void {
    if (this.sendFn) {
      this.sendFn(event, payload);
    }
  }
  
  /**
   * Start processing queued messages
   */
  private startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processQueues();
    }, 4); // Process every 4ms
  }
  
  /**
   * Process message queues
   */
  private processQueues(): void {
    // Process priority queue first
    while (this.priorityQueue.length > 0) {
      const msg = this.priorityQueue.shift()!;
      this.sendImmediate(msg.event, msg.payload);
    }
    
    // Process up to 3 normal messages per tick
    let processed = 0;
    while (this.normalQueue.length > 0 && processed < 3) {
      const msg = this.normalQueue.shift()!;
      this.sendImmediate(msg.event, msg.payload);
      processed++;
    }
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.priorityQueue = [];
    this.normalQueue = [];
    this.sendFn = null;
  }
}

// ===== PING BURST MANAGER =====
export class PingBurstManager {
  private pendingBursts: Map<string, { pings: number[]; startTime: number }> = new Map();
  
  /**
   * Start a ping burst
   */
  startBurst(burstId: string): void {
    this.pendingBursts.set(burstId, { pings: [], startTime: HighPrecisionTimer.now() });
  }
  
  /**
   * Record a ping response in the burst
   */
  recordPing(burstId: string, latency: number): boolean {
    const burst = this.pendingBursts.get(burstId);
    if (!burst) return false;
    
    burst.pings.push(latency);
    
    // Check if burst is complete
    if (burst.pings.length >= ULTRA_CONFIG.PING_BURST_COUNT) {
      return true; // Burst complete
    }
    
    return false;
  }
  
  /**
   * Get burst result (uses minimum latency for accuracy)
   */
  getBurstResult(burstId: string): number | null {
    const burst = this.pendingBursts.get(burstId);
    if (!burst || burst.pings.length === 0) return null;
    
    // Use minimum ping (most accurate representation)
    const result = Math.min(...burst.pings);
    this.pendingBursts.delete(burstId);
    
    return result;
  }
  
  /**
   * Cleanup old bursts
   */
  cleanup(): void {
    const now = HighPrecisionTimer.now();
    for (const [id, burst] of this.pendingBursts) {
      if (now - burst.startTime > 2000) { // 2 second timeout
        this.pendingBursts.delete(id);
      }
    }
  }
}

// ===== SINGLETON INSTANCES =====
export const ultraLatencyPredictor = new KalmanLatencyPredictor();
export const networkAnalyzer = new NetworkQualityAnalyzer();
export const connectionWarmer = new ConnectionWarmer();
export const fastPathRouter = new FastPathRouter();
export const pingBurstManager = new PingBurstManager();

// ===== UTILITY: Generate ultra-short ID =====
let ultraIdCounter = 0;
export function ultraShortId(): string {
  ultraIdCounter = (ultraIdCounter + 1) % 65536;
  return ultraIdCounter.toString(36);
}
