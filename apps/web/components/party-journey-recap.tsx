"use client";

import type { JourneyLine } from "@/lib/party-day-social";
import { Button } from "@game-platform/ui";
import { Swords } from "lucide-react";

/** Party Journey — today's memory with friends (not raw stats) */
export function PartyJourneyRecap({
  lines,
  onRematch,
}: {
  lines: JourneyLine[];
  onRematch: () => void;
}) {
  if (lines.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">오늘의 Party Journey</p>
      <ul className="mt-3 space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="text-sm">
            <span className="mr-2">{line.emoji}</span>
            {line.text}
          </li>
        ))}
      </ul>
      <Button className="mt-4 w-full gap-1" onClick={onRematch}>
        <Swords className="size-4" /> 한 판 더
      </Button>
    </div>
  );
}
