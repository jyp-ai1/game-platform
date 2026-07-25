"use client";

import { useEffect, useState } from "react";

import { getWeeklyChallenge } from "@/lib/weekly-challenge";

export function WeeklyChallengeStrip() {
  const [state, setState] = useState(() => getWeeklyChallenge());

  useEffect(() => {
    setState(getWeeklyChallenge());
  }, []);

  const pct = Math.round((state.completedPlays / state.targetPlays) * 100);

  return (
    <section className="rounded-3xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h3 className="font-semibold">Weekly Challenge</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {state.featuredSlug} · {state.completedPlays}/{state.targetPlays} plays
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
