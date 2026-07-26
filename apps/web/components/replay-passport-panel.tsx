"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { ReplayIdentityCard } from "@/components/replay-identity-card";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildReplayPassport } from "@/lib/replay-loop";
import { getMemoryFlashes } from "@/lib/memory-engine";
import { getUnlockedPlatformAchievements } from "@/lib/achievement-engine";
import { useMounted } from "@/lib/use-mounted";

/** Replay Passport — Steam Library for your game life. */
export function ReplayPassportPanel({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const passport = useMemo(() => {
    if (!mounted) return null;
    return buildReplayPassport(games);
  }, [games, mounted]);

  const platformAchievements = useMemo(() => {
    if (!mounted) return [];
    return getUnlockedPlatformAchievements();
  }, [mounted]);

  const memories = useMemo(() => {
    if (!mounted) return [];
    return getMemoryFlashes(games, 2);
  }, [games, mounted]);

  if (!mounted || !passport) return null;

  return (
    <Container className="py-8 space-y-8">
      <ReplayIdentityCard games={games} />

      {memories.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card/50 p-5">
          <h2 className="font-semibold">Memory</h2>
          <ul className="mt-3 space-y-2">
            {memories.map((m) => (
              <li key={m.id}>
                <Link href={m.href} className="flex items-center gap-2 text-sm hover:text-primary">
                  <span>{m.emoji}</span>
                  <span>{m.headline} — {m.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-card/60 p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <PassportStat label="Coins" value={passport.coins.toLocaleString()} />
          <PassportStat label="Collection" value={`${passport.collectionPercent}%`} />
          <PassportStat label="Achievements" value={String(passport.achievementCount)} />
          <PassportStat label="Challenges" value={String(passport.pendingChallenges)} />
        </div>

        <div className="mt-8">
          <h2 className="font-semibold">Collections</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {passport.genreCollections.map((c) => (
              <div key={c.genre} className="rounded-xl border border-white/10 bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span className="font-bold tabular-nums text-primary">{c.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {platformAchievements.length > 0 ? (
          <div className="mt-8">
            <h2 className="font-semibold">Achievements</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {platformAchievements.map((a) => (
                <span
                  key={a.id}
                  className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm"
                >
                  {a.titleKo}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/journey" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Timeline →
          </Link>
          <Link href="/community" className="rounded-xl border px-4 py-2 text-sm">
            Replay Feed →
          </Link>
          <Link href="/creators" className="rounded-xl border border-violet-500/30 px-4 py-2 text-sm text-violet-300">
            Creator →
          </Link>
          <Link href="/wrapped" className="rounded-xl border px-4 py-2 text-sm">
            Wrapped →
          </Link>
        </div>
      </div>
    </Container>
  );
}

function PassportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
