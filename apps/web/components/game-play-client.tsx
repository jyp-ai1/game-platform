"use client";

import { GamePlayer } from "@/components/game-player";
import type { PlayableSlug } from "@/lib/playable-games";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fullscreen play shell for /games/{slug}/play.
 * NAV: Detail → Play (push) shows Character lobby inside the game.
 * In-game Exit → lobby (game-owned). Lobby browser Back → Detail.
 * Do NOT route Exit to home or detail — games flip to lobby via setStarted(false).
 */
export function GamePlayClient({
  slug,
  engineSlug,
  title,
}: {
  slug: string;
  engineSlug: string;
  title: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  // Agar/Bomber exit is lobby-local; ignore replay:game-exit navigation to detail/home.
  // (Legacy listeners previously router.push(`/games/${slug}`) and broke Exit→Lobby.)

  return (
    <div ref={rootRef} tabIndex={-1} className="flex h-full min-h-0 flex-col outline-none">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/80 px-3 py-2">
        <button
          type="button"
          data-testid="mp-play-back-detail"
          onClick={() => {
            // Prefer history so Back stack stays Detail ← Lobby
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
              return;
            }
            router.replace(`/games/${slug}`);
          }}
          className="text-xs font-medium text-white/70 transition hover:text-white"
        >
          ← {title}
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <GamePlayer slug={engineSlug as PlayableSlug} catalogSlug={slug} instantPlay fullscreen />
      </div>
    </div>
  );
}
