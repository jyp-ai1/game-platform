"use client";

import { getGameLibraryBadge, getCompleted, getMastered, getWishlist } from "@/lib/library-store";
import { getBestScore } from "@game-platform/game-sdk";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";

export function GameDetailCollectionPanel({ gameSlug }: { gameSlug: string }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const best = getBestScore(gameSlug);
  const badge = getGameLibraryBadge(gameSlug, best, best);
  const inCompleted = getCompleted().includes(gameSlug);
  const inMastered = getMastered().includes(gameSlug);
  const inWishlist = getWishlist().includes(gameSlug);

  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Collection</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge active label={badge} />
        {inCompleted ? <Badge active label="Completed" /> : null}
        {inMastered ? <Badge active label="Mastered" /> : null}
        {inWishlist ? <Badge label="Wishlist" /> : null}
      </div>
    </div>
  );
}

function Badge({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-primary/20 text-primary" : "border border-white/10 text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}
