"use client";

import { useEffect, useState } from "react";

export function HealthAiSummary() {
  const [lines, setLines] = useState<{ gameSlug: string; count: number; theme: string }[]>([]);

  useEffect(() => {
    import("@/lib/community-store").then((m) => {
      const summary = m.getCommunityAiSummary();
      if (summary.length === 0) {
        setLines([
          { gameSlug: "snake", count: 3, theme: "stage UX" },
          { gameSlug: "memory", count: 2, theme: "mobile touch" },
        ]);
      } else {
        setLines(summary);
      }
    });
  }, []);

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <h2 className="font-semibold">AI Summary — Today</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {lines.map((l) => (
          <li key={l.gameSlug}>
            <span className="capitalize">{l.gameSlug}</span> — {l.count}건 ({l.theme})
          </li>
        ))}
      </ul>
    </section>
  );
}
