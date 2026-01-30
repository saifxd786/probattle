/**
 * LUDO KING-LEVEL SYNC HOOK
 * 
 * This hook integrates all sync components for Ludo King-quality real-time gameplay.
 * 
 * Usage:
 * - Wraps the sync engine, predictive animator, and connection manager
 * - Provides simple API for components
 * - Handles all edge cases and error recovery
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  ludoSyncEngine, 
  generateActionId,
  SYNC_CONFIG 
} from '@/utils/ludoSyncEngine';
import { 
  ludoPredictiveAnimator,
  ANIMATION_TIMING 
} from '@/utils/ludoPredictiveAnimator';
import { 
  globalLatencyTracker, 
  globalQoSManager,
  type ConnectionQuality 
} from '@/utils/realtimeOptimizer';

interface SyncState {
  isConnected: boolean;
  connectionQuality: ConnectionQuality;
  latency: number;
  predictedLatency: number;
  jitter: number;
  isSynced: boolean;
  pendingActions: number;
  lastSyncTime: number;
}

interface UseLudoKingSyncOptions {
  roomId: string;
  userId: string;
  onStateUpdate?: (state: any) => void;
  onDesync?: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useLudoKingSync(options: UseLudoKingSyncOptions) {
  const { roomId, userId, onStateUpdate, onDesync, onConnectionChange } = options;
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconcileIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPingsRef = useRef<Map<string, number>>(new Map());
  
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    connectionQuality: 'good',
    latency: 50,
    predictedLatency: 50,
    jitter: 0,
    isSynced: true,
    pendingActions: 0,
    lastSyncTime: Date.now()
  });
  
  // Initialize sync engine
  useEffect(() => {
    if (!roomId || !userId) return;
    
    // Create optimized channel
    const channel = supabase.channel(`ludo-king-${roomId}`, {
      config: {
        broadcast: {
          self: false,
          ack: false
        }
      }
    });
    
    // Initialize sync engine
    ludoSyncEngine.initialize(channel, userId, {
      onStateUpdate,
      onDesync,
      onRollback: (previousState) => {
        console.log('[LudoKingSync] Rollback triggered:', previousState);
      }
    });
    
    // Subscribe to events
    channel
      .on('broadcast', { event: 'ping' }, (payload) => {
        const { senderId, pingId, timestamp } = payload.payload;
        if (senderId !== userId) {
          // Respond with pong
          channel.send({
            type: 'broadcast',
            event: 'pong',
            payload: { senderId: userId, pingId, originalTimestamp: timestamp }
          });
        }
      })
      .on('broadcast', { event: 'pong' }, (payload) => {
        const { senderId, pingId, originalTimestamp } = payload.payload;
        if (senderId !== userId && pendingPingsRef.current.has(pingId)) {
          const latency = Date.now() - originalTimestamp;
          pendingPingsRef.current.delete(pingId);
          
          // Record latency
          globalLatencyTracker.addSample(latency);
          ludoSyncEngine.recordLatency(latency);
          
          // Update state
          const quality = globalLatencyTracker.getQuality();
          const stats = globalLatencyTracker.getStats();
          
          setSyncState(prev => ({
            ...prev,
            latency: stats.median,
            predictedLatency: stats.average,
            jitter: stats.jitter,
            connectionQuality: quality === 'disconnected' ? 'poor' : quality
          }));
          
          globalQoSManager.updateQuality(quality);
        }
      })
      .on('broadcast', { event: 'action_confirm' }, (payload) => {
        const { actionId } = payload.payload;
        ludoSyncEngine.confirmAction(actionId);
        
        setSyncState(prev => ({
          ...prev,
          pendingActions: Math.max(0, prev.pendingActions - 1),
          lastSyncTime: Date.now()
        }));
      })
      .on('broadcast', { event: 'checksum' }, (payload) => {
        const { senderId, checksum } = payload.payload;
        if (senderId !== userId) {
          const isSynced = ludoSyncEngine.verifySync(checksum);
          setSyncState(prev => ({
            ...prev,
            isSynced,
            lastSyncTime: Date.now()
          }));
        }
      })
      .subscribe((status) => {
        const isConnected = status === 'SUBSCRIBED';
        setSyncState(prev => ({ ...prev, isConnected }));
        onConnectionChange?.(isConnected);
        
        if (isConnected) {
          startPingLoop();
          startReconcileLoop();
        }
      });
    
    channelRef.current = channel;
    
    return () => {
      stopPingLoop();
      stopReconcileLoop();
      ludoSyncEngine.destroy();
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, userId, onStateUpdate, onDesync, onConnectionChange]);
  
  // Ping loop for latency measurement
  const startPingLoop = useCallback(() => {
    stopPingLoop();
    
    const sendPing = () => {
      if (!channelRef.current) return;
      
      const pingId = `ping-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = Date.now();
      
      pendingPingsRef.current.set(pingId, timestamp);
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'ping',
        payload: { senderId: userId, pingId, timestamp }
      }).catch(() => {
        pendingPingsRef.current.delete(pingId);
      });
      
      // Cleanup old pings
      const now = Date.now();
      pendingPingsRef.current.forEach((time, id) => {
        if (now - time > 2000) {
          pendingPingsRef.current.delete(id);
        }
      });
    };
    
    // Initial ping
    setTimeout(sendPing, 50);
    
    // Adaptive interval based on QoS
    const setupInterval = () => {
      const interval = globalQoSManager.getPingInterval();
      pingIntervalRef.current = setInterval(sendPing, interval);
    };
    
    setupInterval();
  }, [userId]);
  
  const stopPingLoop = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);
  
  // Reconcile loop for state verification
  const startReconcileLoop = useCallback(() => {
    stopReconcileLoop();
    
    reconcileIntervalRef.current = setInterval(() => {
      if (!channelRef.current) return;
      
      const stats = ludoSyncEngine.getStats();
      
      // Broadcast checksum
      channelRef.current.send({
        type: 'broadcast',
        event: 'checksum',
        payload: { senderId: userId, checksum: stats.checksum }
      });
      
      // Check if force sync needed
      if (ludoSyncEngine.needsForceSync()) {
        console.log('[LudoKingSync] Force sync needed');
        onDesync?.();
      }
      
      setSyncState(prev => ({
        ...prev,
        pendingActions: stats.optimistic.pendingActions
      }));
      
    }, SYNC_CONFIG.RECONCILE_INTERVAL_MS);
  }, [userId, onDesync]);
  
  const stopReconcileLoop = useCallback(() => {
    if (reconcileIntervalRef.current) {
      clearInterval(reconcileIntervalRef.current);
      reconcileIntervalRef.current = null;
    }
  }, []);
  
  // Send action with optimistic update
  const sendAction = useCallback((
    type: string,
    payload: any,
    optimisticState?: any
  ): string | null => {
    const actionId = generateActionId();
    
    const success = ludoSyncEngine.sendAction(
      actionId,
      type,
      payload,
      optimisticState
    );
    
    if (success) {
      setSyncState(prev => ({
        ...prev,
        pendingActions: prev.pendingActions + 1
      }));
      return actionId;
    }
    
    return null;
  }, []);
  
  // Send priority action (immediate, bypasses batching)
  const sendPriorityAction = useCallback((type: string, payload: any) => {
    ludoSyncEngine.sendPriorityAction(type, payload);
  }, []);
  
  // Update local state
  const updateState = useCallback((newState: any) => {
    ludoSyncEngine.updateState(newState);
  }, []);
  
  // Get animation lead time for predictive animations
  const getAnimationLeadTime = useCallback(() => {
    return ludoSyncEngine.getAnimationLeadTime();
  }, []);
  
  // Manual reconnect
  const reconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    // Will trigger useEffect to recreate
    setSyncState(prev => ({ ...prev, isConnected: false }));
  }, []);
  
  return {
    syncState,
    sendAction,
    sendPriorityAction,
    updateState,
    getAnimationLeadTime,
    reconnect,
    channel: channelRef.current
  };
}

export default useLudoKingSync;
