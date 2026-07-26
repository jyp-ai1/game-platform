"use client";

import { fetchSituations } from "@game-platform/replay-engine/social";
import type { SituationRecommendation } from "@game-platform/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HomeEmptyLine } from "@/components/home-empty-line";
import { emitPlatformNoticeWithRetry } from "@/lib/platform-notice";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () =>
      void fetchSituations()
        .then((s) => {
          setSituations(s);
          setLoaded(true);
        })
        .catch(() => {
          emitPlatformNoticeWithRetry("추천", "상황 정보를 불러오지 못했습니다.");
          setLoaded(true);
        });
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, []);

  if (!loaded) return null;

  return (
    <section
      aria-labelledby="people-first-heading"
      className="border-b border-white/5 py-5 sm:py-6"
    >
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-xs uppercase tracking-widest text-primary">People First</p>
        <h2 id="people-first-heading" className="mt-1 text-lg font-bold">
          지금 이 순간
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">게임이 아니라 상황을 추천합니다</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {situations.length === 0 ? (
            <HomeEmptyLine testId="friend-empty" className="w-full">
              지금 플레이 중인 친구가 없습니다.
            </HomeEmptyLine>
          ) : (
            situations.slice(0, 1).map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className={`motion-base rounded-xl border px-4 py-3 text-sm transition hover:opacity-90 ${KIND_STYLES[s.kind]}`}
              >
                <span className="font-medium">{s.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.subtitle}</span>
                <span className="mt-1 inline-block text-xs text-primary">{s.cta} →</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
