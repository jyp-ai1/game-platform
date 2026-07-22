"use client";

import {
  getServerWeeklyMissionSnapshot,
  getWeeklyMission,
  getWeeklyMissionDefinition,
  isWeeklyMissionComplete,
  subscribeEngagementEvents,
  subscribeWeeklyMission,
} from "@game-platform/game-sdk";
import { Button, Container, Progress, SectionTitle } from "@game-platform/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

export function WeeklyMissionCard() {
  const state = useSyncExternalStore(
    subscribeWeeklyMission,
    getWeeklyMission,
    getServerWeeklyMissionSnapshot
  );

  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    return subscribeEngagementEvents((event) => {
      if (event.type !== "weekly-mission-completed") {
        return;
      }
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 800);
    });
  }, []);

  // Empty until hydration replaces the SSR-safe placeholder snapshot with
  // the real client-side weekly-mission state.
  if (!state.week) {
    return null;
  }

  const definition = getWeeklyMissionDefinition(state.missionId);
  if (!definition) {
    return null;
  }

  const done = isWeeklyMissionComplete(state);
  const percent = (state.progress.current / state.progress.target) * 100;

  return (
    <section className="border-b py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="🗓️ Weekly Mission"
          description="이번 주 누적 목표를 달성하고 XP를 받으세요."
        />

        <div className="relative mt-6 flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{definition.title}</p>
              {done ? (
                <Check className="size-4 text-primary" aria-label="완료" />
              ) : (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.min(state.progress.current, state.progress.target)} /{" "}
                  {state.progress.target}
                </span>
              )}
            </div>
            {!done ? (
              <Progress
                value={percent}
                label={`${definition.title} 진행률`}
                className="mt-2"
              />
            ) : null}
          </div>

          {!done ? (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={definition.linkHref}>▶ Play</Link>}
            />
          ) : null}

          {justCompleted ? (
            <span
              className="mission-xp-float pointer-events-none absolute right-4 top-2 text-sm font-semibold text-primary"
              aria-hidden="true"
            >
              ✔ +{definition.xp} XP
            </span>
          ) : null}
        </div>

        {done ? (
          <p className="animate-in fade-in mt-4 text-sm font-medium text-primary">
            🎉 이번 주 미션 완료! (+{definition.xp} XP 획득)
          </p>
        ) : null}
      </Container>
    </section>
  );
}
