"use client";

import { fetchSituations, playModeActions } from "@game-platform/replay-engine/social";
import type { SituationRecommendation } from "@game-platform/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

const KIND_STYLES: Record<SituationRecommendation["kind"], string> = {
  join_friend: "border-primary/40 bg-primary/10",
  tournament_soon: "border-violet-500/40 bg-violet-500/10",
  mission_ready: "border-amber-500/40 bg-amber-500/10",
  genre_suggest: "border-cyan-500/40 bg-cyan-500/10",
  party_invite: "border-emerald-500/40 bg-emerald-500/10",
  quick_match: "border-white/15 bg-white/5",
};

/** People-first home — situation-based recommendations, not game lists. */
export function HomePeopleFirstStrip() {
  const [situations, setSituations] = useState<SituationRecommendation[]>([]);
  const snakeModes = playModeActions("snake");

  useEffect(() => {
    void fetchSituations().then(setSituations);
    const id = setInterval(() => void fetchSituations().then(setSituations), 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="border-b border-white/5 py-6">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-xs uppercase tracking-widest text-primary">People First</p>
        <h2 className="mt-1 text-lg font-bold">지금 이 순간</h2>
        <p className="mt-1 text-sm text-muted-foreground">게임이 아니라 상황을 추천합니다</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {situations.length === 0 ? (
            <p className="text-sm text-muted-foreground">친구가 온라인이면 여기서 바로 참가</p>
          ) : (
            situations.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className={`rounded-xl border px-4 py-3 text-sm transition hover:opacity-90 ${KIND_STYLES[s.kind]}`}
              >
                <span className="font-medium">{s.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.subtitle}</span>
                <span className="mt-1 inline-block text-xs text-primary">{s.cta} →</span>
              </Link>
            ))
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {snakeModes.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30"
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
