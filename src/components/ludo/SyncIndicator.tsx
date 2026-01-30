/**
 * LUDO SYNC INDICATOR
 * 
 * Subtle "Syncing..." text that appears only when network
 * latency exceeds 120ms after a 400ms delay.
 * No spinner - just soft text for non-intrusive UX.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { syncIndicator, type SyncIndicatorState } from '@/utils/ludoMicroLatency';

interface SyncIndicatorProps {
  className?: string;
}

const SyncIndicator = ({ className }: SyncIndicatorProps) => {
  const [state, setState] = useState<SyncIndicatorState>({
    isVisible: false,
    opacity: 0,
    message: 'Syncing...',
  });

  useEffect(() => {
    // Subscribe to sync indicator updates
    syncIndicator.setOnUpdate((newState) => {
      setState({ ...newState });
    });

    return () => {
      syncIndicator.setOnUpdate(() => {});
    };
  }, []);

  return (
    <AnimatePresence>
      {state.isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: state.opacity * 0.7, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className={`
            text-xs font-medium text-gray-400/80
            tracking-wide select-none pointer-events-none
            ${className}
          `}
          style={{
            textShadow: '0 0 8px rgba(148, 163, 184, 0.3)',
          }}
        >
          {state.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SyncIndicator;
