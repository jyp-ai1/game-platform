"use client";

import { useSyncExternalStore } from "react";

/** Avoid SSR/client mismatch for localStorage-driven UI. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
