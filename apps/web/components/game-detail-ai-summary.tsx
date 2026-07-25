"use client";

import { useEffect, useState } from "react";

import { getCommunityAiSummary } from "@/lib/community-store";

export function GameDetailAiSummary({ gameSlug }: { gameSlug: string }) {
  const [lines, setLines] = useState<{ gameSlug: string; count: number; theme: string }[]>([]);

  useEffect(() => {
    const all = getCommunityAiSummary();
    setLines(all.filter((l) => l.gameSlug === gameSlug).slice(0, 3));
  }, [gameSlug]);

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <h3 className="font-semibold">AI Summary</h3>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No issues reported — players enjoy this game.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {lines.map((l) => (
            <li key={l.theme}>
              {l.count} reports · {l.theme}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
