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
import { buildFullReplayIdentity, getIdentityStatement } from "@/lib/replay-identity";
import { getPrimaryPlayHref } from "@/lib/motivation-engine";
import { useMounted } from "@/lib/use-mounted";

/** Replay Identity — emotional first, stats second. */
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

  const statement = identity ? getIdentityStatement(identity) : "";
  const playHref = mounted ? getPrimaryPlayHref(games) : "/games";

  if (!mounted || !identity) return null;

  if (compact) {
    return (
      <p className="text-sm font-medium text-primary">{statement}</p>
    );
  }

  return (
    <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card/80 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay Passport</p>
      <p className="mt-4 text-sm text-muted-foreground">당신은</p>
      <h2 className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">{statement}</h2>

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
        <Stat label="Level" value={`Lv.${identity.level}`} />
        <Stat label="Replay Score" value={String(identity.replayScore)} />
        <Stat label="Collection" value={`${identity.collectionPercent}%`} />
        <Stat label="Season" value={identity.seasonTierKo} />
      </div>

      <Link
        href={playHref}
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Replay 시작 →
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
