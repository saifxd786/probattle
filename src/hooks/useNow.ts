import { useEffect, useState } from "react";

/**
 * A small, reliable clock hook.
 * - Ticks on an interval
 * - Also re-syncs when the tab/app becomes visible again
 */
export function useNow(intervalMs: number = 1000) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNowMs(Date.now());

    tick();
    const id = window.setInterval(tick, intervalMs);

    const onResume = () => tick();
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [intervalMs]);

  return nowMs;
}
