"use client";

import type { Game } from "@game-platform/shared";
import { History } from "lucide-react";

import { getRuntimeConfig } from "@/lib/game-runtime-config";
import { replayCard } from "@/lib/replay-os";

interface PatchEntry {
  version: string;
  date: string;
  notes: string[];
}

function buildPatchHistory(game: Game): PatchEntry[] {
  const updated = game.updatedAt?.slice(0, 10) ?? "2026-07-25";
  const created = game.createdAt?.slice(0, 10) ?? updated;
  const runtime = getRuntimeConfig(game.slug);
  const entries: PatchEntry[] = [
    {
      version: "1.2.0",
      date: updated,
      notes: [
        "Universal Runtime 3.0 — unified Loading → Result flow",
        runtime.boss ? `Boss stage: ${runtime.boss.name}` : "Stage progression enabled",
        "Live score sync on Home & Profile",
      ],
    },
    {
      version: "1.1.0",
      date: created,
      notes: [
        "Achievement & Collection integration",
        `Difficulty: ${game.difficulty}`,
        game.tags.length > 0 ? `Tags: ${game.tags.slice(0, 3).join(", ")}` : "Added to Discover browse",
      ],
    },
    {
      version: "1.0.0",
      date: created,
      notes: ["Initial release on Re:Play platform"],
    },
  ];
  return entries;
}

export function GameDetailPatchNotes({ game }: { game: Game }) {
  const patches = buildPatchHistory(game);

  return (
    <section className={replayCard("p-5")}>
      <div className="flex items-center gap-2">
        <History className="size-4 text-primary" />
        <h3 className="font-semibold">Patch Notes & Update History</h3>
      </div>
      <ol className="mt-4 space-y-4">
        {patches.map((p) => (
          <li key={p.version} className="border-l-2 border-primary/30 pl-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold tabular-nums">v{p.version}</span>
              <span className="text-xs text-muted-foreground">{p.date}</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {p.notes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
