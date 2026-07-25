"use client";

import type { Game } from "@game-platform/shared";
import { Badge } from "@game-platform/ui";
import { Code2, History, Tag } from "lucide-react";

import { getDifficultyLabel, getRuntimeConfig } from "@/lib/game-runtime-config";
import { replayCard } from "@/lib/replay-os";

export function GameDetailMetaPanel({ game }: { game: Game }) {
  const runtime = getRuntimeConfig(game.slug);
  const version = "1.0.0";
  const patchDate = game.updatedAt?.slice(0, 10) ?? "2026-07-25";

  return (
    <section className={replayCard("p-5")}>
      <div className="flex items-center gap-2">
        <Code2 className="size-4 text-primary" />
        <h3 className="font-semibold">Developer & Version</h3>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Developer</dt>
          <dd className="font-medium">Re:Play Studio</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Version</dt>
          <dd className="font-medium">{version}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last Patch</dt>
          <dd className="flex items-center gap-1 font-medium">
            <History className="size-3" /> {patchDate}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Difficulty</dt>
          <dd>
            <Badge variant="outline">{getDifficultyLabel(game.slug)}</Badge>
          </dd>
        </div>
        {runtime.boss ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Boss</dt>
            <dd className="flex items-center gap-1 font-medium text-amber-400">
              <Tag className="size-3" />
              {runtime.boss.name} @ {runtime.boss.threshold.toLocaleString()}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

export function GameDetailTrailer({ game }: { game: Game }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-muted/30">
      {game.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={game.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80" />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px]">
        <div className="rounded-full border border-white/20 bg-background/60 px-6 py-3 text-sm font-medium backdrop-blur">
          ▶ Trailer Preview
        </div>
      </div>
    </div>
  );
}
