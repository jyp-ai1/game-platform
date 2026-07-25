"use client";

import { DailyChallengeCard } from "@/components/daily-challenge-card";
import { WeeklyMissionCard } from "@/components/weekly-mission-card";

export function HomeRetentionHub() {
  return (
    <section className="border-y border-white/5 bg-card/20 py-6">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2">
        <DailyChallengeCard />
        <WeeklyMissionCard />
      </div>
    </section>
  );
}
