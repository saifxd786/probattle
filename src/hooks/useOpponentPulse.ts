/**
 * LUDO OPPONENT PULSE HOOK
 * 
 * Provides subtle scale pulse animation on opponent's avatar
 * to indicate live presence during their turn.
 */

import { useState, useEffect, useCallback } from 'react';
import { opponentPulse, MICRO_LATENCY } from '@/utils/ludoMicroLatency';

interface UseOpponentPulseOptions {
  opponentColor: string | null;
  isOpponentTurn: boolean;
  isOpponentOnline: boolean;
}

interface OpponentPulseState {
  scale: number;
  isActive: boolean;
}

export const useOpponentPulse = ({
  opponentColor,
  isOpponentTurn,
  isOpponentOnline,
}: UseOpponentPulseOptions) => {
  const [pulseState, setPulseState] = useState<OpponentPulseState>({
    scale: 1,
    isActive: false,
  });

  useEffect(() => {
    // Start pulse when it's opponent's turn and they're online
    if (isOpponentTurn && isOpponentOnline && opponentColor) {
      opponentPulse.setOnUpdate((state) => {
        setPulseState({
          scale: state.scale,
          isActive: state.isActive,
        });
      });
      
      opponentPulse.startPresencePulse(opponentColor);
    } else {
      opponentPulse.stopPresencePulse();
      setPulseState({ scale: 1, isActive: false });
    }

    return () => {
      opponentPulse.stopPresencePulse();
    };
  }, [isOpponentTurn, isOpponentOnline, opponentColor]);

  // Trigger immediate pulse (e.g., when opponent rolls dice)
  const triggerPulse = useCallback(() => {
    opponentPulse.triggerImmediatePulse();
  }, []);

  return {
    pulseScale: pulseState.scale,
    isPulsing: pulseState.isActive,
    triggerPulse,
  };
};

export default useOpponentPulse;
