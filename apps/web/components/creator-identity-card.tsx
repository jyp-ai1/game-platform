"use client";

import { subscribeEngagement, getLevelProgress, getServerLevelProgressSnapshot } from "@game-platform/game-sdk";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { getCreatorIdentity, formatCreatorStats } from "@/lib/creator/creator-identity";
import { getCreatorBadges, CREATOR_BADGES } from "@/lib/creator/creator-types";
import { useMounted } from "@/lib/use-mounted";

/** Dual Player + Creator identity card. */
export function CreatorIdentityCard({ compact = false }: { compact?: boolean }) {
  const mounted = useMounted();
  const playerLevel = useSyncExternalStore(subscribeEngagement, getLevelProgress, getServerLevelProgressSnapshot);

  if (!mounted) return null;

  const identity = getCreatorIdentity();
  const badges = getCreatorBadges(identity.creatorLevel, identity.followers);

  if (compact) {
    return (
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/10 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-400">Creator</p>
            <p className="font-semibold">{identity.creatorTitle} · Lv{identity.creatorLevel}</p>
            <p className="text-xs text-muted-foreground">{formatCreatorStats(identity)}</p>
            {badges.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {badges.map((b) => (
                  <span key={b} className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
                    {CREATOR_BADGES.find((x) => x.id === b)?.labelKo}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link href="/studio" className="text-sm font-medium text-primary hover:underline">Studio →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-card/80 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Creator Identity</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Player</p>
          <p className="text-xl font-bold">Lv{playerLevel.level}</p>
          <p className="text-sm text-muted-foreground">{identity.playerTitle}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Developer</p>
          <p className="text-xl font-bold">{identity.creatorTitle}</p>
          <p className="text-sm text-muted-foreground">Creator Lv{identity.creatorLevel}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Published" value={String(identity.publishedCount)} />
        <Stat label="Total Plays" value={identity.totalPlays.toLocaleString()} />
        <Stat label="Likes" value={identity.totalLikes.toLocaleString()} />
        <Stat label="Followers" value={String(identity.followers)} />
      </div>
      <Link href="/studio/build" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
        AI Builder →
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/50 p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold tabular-nums">{value}</p>
    </div>
  );
}
