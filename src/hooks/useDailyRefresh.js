import { useEffect } from "react";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getDelayUntilNextMidnight = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(1, nextMidnight.getTime() - now.getTime());
};

export default function useDailyRefresh(refreshFn, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof refreshFn !== "function") return undefined;

    let intervalId = null;
    const timeoutId = window.setTimeout(() => {
      refreshFn();
      intervalId = window.setInterval(() => {
        refreshFn();
      }, DAY_IN_MS);
    }, getDelayUntilNextMidnight());

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, refreshFn]);
}
