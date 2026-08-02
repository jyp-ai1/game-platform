"use client";

import { createContext, useContext, type ReactNode } from "react";

const InstantPlayContext = createContext(false);

/** Fullscreen play route — skip resume dialog + countdown, auto-focus game. */
export function InstantPlayProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <InstantPlayContext.Provider value={enabled}>{children}</InstantPlayContext.Provider>
  );
}

export function useInstantPlay(): boolean {
  return useContext(InstantPlayContext);
}
