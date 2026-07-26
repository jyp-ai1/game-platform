"use client";

import { useEffect, useState } from "react";

/** Gentle ±1 drift every interval — feels like a live server without wild swings. */
export function useLivePlayerCount(baseCount: number, intervalMs = 5000): number {
  const [display, setDisplay] = useState(baseCount);

  useEffect(() => {
    if (baseCount <= 0) return;
    const id = window.setInterval(() => {
      setDisplay((prev) => {
        const delta = Math.random() < 0.5 ? -1 : 1;
        const next = prev + delta;
        const min = Math.max(1, baseCount - 2);
        const max = baseCount + 2;
        return Math.min(max, Math.max(min, next));
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [baseCount, intervalMs]);

  return display;
}
