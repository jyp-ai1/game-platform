"use client";

import {
  CURRENT_SEASON,
  getSeasonBadge,
  getSeasonProgress,
  getServerSeasonProgressSnapshot,
  subscribeSeason,
} from "@game-platform/game-sdk";
import { Container, Progress, SectionTitle } from "@game-platform/ui";
import { useSyncExternalStore } from "react";

import { useCountUp } from "@/lib/use-count-up";

// Reuses the exact <Progress> pattern header-level-badge.tsx already uses
// for lifetime XP -- reads as "the same kind of bar, a different number"
// rather than a visually competing new widget.
export function SeasonCard() {
  const progress = useSyncExternalStore(
    subscribeSeason,
    getSeasonProgress,
    getServerSeasonProgressSnapshot
  );
  const animatedXp = useCountUp(progress.xpIntoLevel);
  const badge = getSeasonBadge(progress.level);

  return (
    <section className="border-b py-10 sm:py-14">
      <Container>
        <SectionTitle
          title={`🏅 ${CURRENT_SEASON.label}`}
          description="시즌 동안 쌓은 XP로 시즌 레벨과 배지를 올려보세요."
        />
        <div className="mt-6 max-w-md rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium tabular-nums">
              시즌 Lv.{progress.level} · {animatedXp} / {progress.xpNeededForLevel} XP
            </span>
            {badge ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {badge.name}
              </span>
            ) : null}
          </div>
          <Progress
            value={progress.percent}
            label={`시즌 레벨 ${progress.level} 진행률`}
            className="mt-2"
          />
        </div>
      </Container>
    </section>
  );
}
