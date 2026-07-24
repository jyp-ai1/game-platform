"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client mismatch for localStorage-driven UI. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
