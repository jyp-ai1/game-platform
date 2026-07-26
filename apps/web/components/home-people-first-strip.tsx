"use client";

import { fetchPresenceEntries, formatPresenceLabel } from "@game-platform/multiplayer-sdk";
import { ExperienceEngine } from "@game-platform/replay-engine/experience";
import Link from "next/link";
import { useEffect, useState } from "react";

/** People-first home strip — join friends before picking games */
export function HomePeopleFirstStrip() {
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof fetchPresenceEntries>>>([]);
  const tournaments = ExperienceEngine.tournament.upcoming().slice(0, 1);

  useEffect(() => {
    void fetchPresenceEntries().then(setFriends);
    const id = setInterval(() => void fetchPresenceEntries().then(setFriends), 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="border-b border-white/5 py-6">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-xs uppercase tracking-widest text-primary">People First</p>
        <h2 className="mt-1 text-lg font-bold">지금 플레이 중</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">친구가 온라인이면 여기서 바로 참가</p>
          ) : (
            friends.slice(0, 4).map((f) => (
              <Link
                key={f.deviceId}
                href={f.roomCode ? `/p/${f.roomCode}` : `/flagship/snake-io`}
                className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm hover:border-primary/50"
              >
                {formatPresenceLabel(f)} · Join →
              </Link>
            ))
          )}
          {tournaments.map((t) => (
            <Link key={t.id} href="/flagship/snake-io" className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm">
              Tournament {t.maxPlayers}P · {t.status === "live" ? "Live" : "Soon"} →
            </Link>
          ))}
          <Link href="/flagship/snake-io" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:border-primary/30">
            Quick Match (5s) →
          </Link>
        </div>
      </div>
    </section>
  );
}
