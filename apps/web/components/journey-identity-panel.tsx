"use client";

import type { Game } from "@game-platform/shared";
import { Badge, SectionTitle } from "@game-platform/ui";
import { useMemo, useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { replayScoreTier } from "@/lib/replay-score";

export function JourneyIdentityPanel({ games }: { games: Game[] }) {
  const tick = useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const snapshot = useMemo(() => buildWrappedSnapshot(games), [games, tick]);

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/50 p-6 backdrop-blur">
      <SectionTitle title="Replay Identity" description="Wrapped-ready profile snapshot" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IdentityStat label="Replay Score" value={String(snapshot.replayScore)} sub={replayScoreTier(snapshot.replayScore)} />
        <IdentityStat label="Play Style" value={snapshot.playStyle} />
        <IdentityStat label="Favorite Genre" value={snapshot.favoriteGenre} />
        <IdentityStat label="Streak" value={`${snapshot.streakDays} days`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">Weekly {snapshot.weeklyPlays} sessions</Badge>
        <Badge variant="outline">Monthly {snapshot.monthlyMinutes} min</Badge>
        <Badge variant="outline">{snapshot.totalPlays} total plays</Badge>
      </div>
      {snapshot.topGames.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {snapshot.topGames.map((g) => (
            <li key={g.slug}>
              <span className="text-foreground">{g.slug}</span> · {g.plays} plays
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function IdentityStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {sub ? <p className="text-xs text-primary">{sub}</p> : null}
    </div>
  );
}
