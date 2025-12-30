import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

const PullToRefresh = ({ children, onRefresh, disabled = false }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);

  const indicatorY = useTransform(pullDistance, [0, MAX_PULL], [0, 60]);
  const indicatorOpacity = useTransform(pullDistance, [0, PULL_THRESHOLD / 2, PULL_THRESHOLD], [0, 0.5, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 180]);
  const indicatorScale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsPulling(false);
      pullDistance.set(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    const resistance = 0.4; // Add resistance to make pull feel natural
    const distance = Math.min(diff * resistance, MAX_PULL);

    if (distance > 0) {
      e.preventDefault();
    }

    pullDistance.set(distance);
  }, [isPulling, disabled, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);
    const currentPull = pullDistance.get();

    if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      
      // Animate to refresh position
      animate(pullDistance, 60, { duration: 0.2 });

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { duration: 0.3 });
      }
    } else {
      animate(pullDistance, 0, { duration: 0.3 });
    }
  }, [isPulling, pullDistance, onRefresh, isRefreshing]);

  return (
    <div className="relative overflow-hidden h-full">
      {/* Pull indicator */}
      <motion.div
        style={{
          y: indicatorY,
          opacity: indicatorOpacity,
          scale: indicatorScale,
        }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-50"
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : indicatorRotation }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : undefined}
          className="p-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm"
        >
          <RefreshCw className="w-5 h-5 text-primary" />
        </motion.div>
      </motion.div>

      {/* Content container */}
      <motion.div
        ref={containerRef}
        style={{ y: pullDistance }}
        className="h-full overflow-auto touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
