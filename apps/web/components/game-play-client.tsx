"use client";

import { GamePlayer } from "@/components/game-player";
import type { PlayableSlug } from "@/lib/playable-games";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function GamePlayClient({ slug, title }: { slug: string; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    function onExit(event: Event) {
      const detail = (event as CustomEvent<{ gameSlug?: string }>).detail;
      if (detail?.gameSlug !== slug) return;
      router.push(`/games/${slug}`);
    }
    window.addEventListener("replay:game-exit", onExit);
    return () => window.removeEventListener("replay:game-exit", onExit);
  }, [router, slug]);

  return (
    <div ref={rootRef} tabIndex={-1} className="flex h-full min-h-0 flex-col outline-none">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/80 px-3 py-2">
        <button
          type="button"
          onClick={() => router.push(`/games/${slug}`)}
          className="text-xs font-medium text-white/70 transition hover:text-white"
        >
          ← {title}
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <GamePlayer slug={slug as PlayableSlug} instantPlay fullscreen />
      </div>
    </div>
  );
}
