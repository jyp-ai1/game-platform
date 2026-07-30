"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

import { recordGameRetry } from "./game-progress";
import { endTrackedSession, resetTrackedSession, startTrackedSession } from "./session-tracker";

const GameSlugContext = createContext<string | null>(null);

/** Platform provider — injects slug + handles exit progress for all games. */
export function GameSlugProvider({ slug, children }: { slug: string; children: ReactNode }) {
  useEffect(() => {
    function onExit(event: Event) {
      const detail = (event as CustomEvent<{ gameSlug?: string }>).detail;
      if (detail?.gameSlug !== slug) return;
      endTrackedSession(slug);
    }
    function onRetry(event: Event) {
      const detail = (event as CustomEvent<{ gameSlug?: string }>).detail;
      if (detail?.gameSlug !== slug) return;
      recordGameRetry(slug);
      resetTrackedSession(slug);
      startTrackedSession(slug);
    }
    window.addEventListener("replay:game-exit", onExit);
    window.addEventListener("replay:game-retry", onRetry);
    return () => {
      window.removeEventListener("replay:game-exit", onExit);
      window.removeEventListener("replay:game-retry", onRetry);
    };
  }, [slug]);

  return <GameSlugContext.Provider value={slug}>{children}</GameSlugContext.Provider>;
}

export function useGameSlug(): string | null {
  return useContext(GameSlugContext);
}

export function requireGameSlug(explicit?: string): string | null {
  return explicit ?? useGameSlug();
}
