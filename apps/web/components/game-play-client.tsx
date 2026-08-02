"use client";

import { GamePlayer } from "@/components/game-player";
import type { PlayableSlug } from "@/lib/playable-games";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function GamePlayClient({ slug, title }: { slug: string; title: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  return (
    <div ref={rootRef} tabIndex={-1} className="flex h-full min-h-0 flex-col outline-none">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/80 px-3 py-2">
        <Link
          href={`/games/${slug}`}
          className="text-xs font-medium text-white/70 transition hover:text-white"
        >
          ← {title}
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/90">
          Playing
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <GamePlayer slug={slug as PlayableSlug} instantPlay fullscreen />
      </div>
    </div>
  );
}
