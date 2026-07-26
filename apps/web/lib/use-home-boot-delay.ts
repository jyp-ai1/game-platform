"use client";

import { useEffect, useState } from "react";

/** Minimum skeleton display on first home paint — prevents layout jump. */
export function useHomeBootDelay(minMs = 500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), minMs);
    return () => window.clearTimeout(id);
  }, [minMs]);

  return ready;
}
