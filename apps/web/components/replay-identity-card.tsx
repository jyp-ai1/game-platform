"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  getLastNickname,
  getServerNicknameSnapshot,
  subscribeNickname,
} from "@game-platform/game-sdk";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildFullReplayIdentity } from "@/lib/replay-identity";
import { useMounted } from "@/lib/use-mounted";

/** Replay Identity — profile first screen (Lv · titles · badges). */
export function ReplayIdentityCard({ games, compact = false }: { games: Game[]; compact?: boolean }) {
  const mounted = useMounted();
  const nickname = useSyncExternalStore(
    subscribeNickname,
    getLastNickname,
    getServerNicknameSnapshot
  );
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const identity = useMemo(() => {
    if (!mounted) return null;
    return buildFullReplayIdentity(games, nickname || "Player");
  }, [games, mounted, nickname]);

  if (!mounted || !identity) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {identity.badgeLabelsKo.slice(0, 5).map((b) => (
          <span key={b} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs">
            {b}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card/80 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay Identity</p>
      <h2 className="mt-2 text-3xl font-bold">Lv.{identity.level}</h2>
      <p className="mt-1 text-xl font-semibold text-primary">{identity.titleKo}</p>
      <p className="text-muted-foreground">{identity.title}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {identity.badgeLabelsKo.map((label) => (
          <span
            key={label}
            className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium"
          >
            {label}
          </span>
        ))}
        {identity.streakDays > 0 ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
            Streak {identity.streakDays}일
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Replay Score" value={String(identity.replayScore)} />
        <Stat label="Collection" value={`${identity.collectionPercent}%`} />
        <Stat label="Tier" value={identity.replayTier} />
        <Stat label="Season" value={identity.seasonTierKo} />
      </div>

      {identity.topPercent !== null && identity.topPercent <= 10 ? (
        <p className="mt-4 text-sm font-medium text-emerald-400">
          Top {identity.topPercent}% — 상위 Replay 유저입니다
        </p>
      ) : null}

      <Link href="/journey" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
        내 Timeline →
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
