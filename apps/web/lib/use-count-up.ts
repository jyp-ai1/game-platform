"use client";

import { useEffect, useRef, useState } from "react";

// Animates from the previous value to a new one whenever `value` changes
// (e.g. XP increasing) — the very first render shows `value` immediately,
// with no animation from 0.
export function useCountUp(value: number, durationMs = 600): number {
  const [display, setDisplay] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = to;
    if (from === to) {
      return;
    }

    const startTime = performance.now();
    let rafId: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / durationMs);
      setDisplay(Math.round(from + (to - from) * progress));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return display;
}
