"use client";

import {
  getDailyMission,
  getMissionDefinition,
  getServerDailyMissionSnapshot,
  isDailyChallengeComplete,
  subscribeEngagementEvents,
  subscribeMissions,
} from "@game-platform/game-sdk";
import { Button, Container, Progress, SectionTitle } from "@game-platform/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

export function DailyChallengeCard() {
  const state = useSyncExternalStore(
    subscribeMissions,
    getDailyMission,
    getServerDailyMissionSnapshot
  );

  // Tracks mission ids whose "+N XP" float animation is currently playing —
  // purely transient UI state driven by the (ephemeral) engagement event
  // bus, not the persisted mission state itself.
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    return subscribeEngagementEvents((event) => {
      if (event.type !== "mission-completed") {
        return;
      }
      const { missionId } = event;
      setJustCompleted((prev) => new Set(prev).add(missionId));
      setTimeout(() => {
        setJustCompleted((prev) => {
          const next = new Set(prev);
          next.delete(missionId);
          return next;
        });
      }, 800);
    });
  }, []);

  // Empty until hydration replaces the SSR-safe placeholder snapshot with
  // the real client-side mission state.
  if (!state.date) {
    return null;
  }

  const complete = isDailyChallengeComplete(state);
  const totalXp = state.missionIds.reduce(
    (sum, id) => sum + (getMissionDefinition(id)?.xp ?? 0),
    0
  );

  return (
    <section className="border-b py-10 sm:py-14">
      <Container>
        <SectionTitle
          title="🏆 Today's Challenge"
          description="오늘의 미션을 완료하고 XP를 받으세요."
        />

        <div className="mt-6 flex flex-col gap-3">
          {state.missionIds.map((id) => {
            const definition = getMissionDefinition(id);
            if (!definition) {
              return null;
            }
            const progress = state.progress[id] ?? {
              current: 0,
              target: definition.target,
            };
            const done = state.completed.includes(id);
            const percent = (progress.current / progress.target) * 100;

            return (
              <div
                key={id}
                className="relative flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{definition.title}</p>
                    {done ? (
                      <Check className="size-4 text-primary" aria-label="완료" />
                    ) : (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.min(progress.current, progress.target)} /{" "}
                        {progress.target}
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

                {justCompleted.has(id) ? (
                  <span
                    className="mission-xp-float pointer-events-none absolute right-4 top-2 text-sm font-semibold text-primary"
                    aria-hidden="true"
                  >
                    ✔ +{definition.xp} XP
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {complete ? (
          <p className="animate-in fade-in mt-4 text-sm font-medium text-primary">
            🎉 오늘의 챌린지 완료! (오늘 미션으로 +{totalXp} XP 획득)
          </p>
        ) : null}
      </Container>
    </section>
  );
}
