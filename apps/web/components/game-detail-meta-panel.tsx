"use client";

import type { Game } from "@game-platform/shared";
import { Badge } from "@game-platform/ui";
import { cn } from "@game-platform/ui";
import { Code2, History, Tag } from "lucide-react";
import { useCallback, useState } from "react";

import { getDifficultyLabel, getRuntimeConfig } from "@/lib/game-runtime-config";
import { replayCard } from "@/lib/replay-os";

/** Click-to-play trailer preview — loops thumbnail with motion when no mp4 asset. */
export function GameDetailTrailer({ game }: { game: Game }) {
  const [playing, setPlaying] = useState(false);
  const previewSrc = game.thumbnailUrl;

  const toggle = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-muted/30"
      data-testid="game-detail-trailer"
    >
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          className={cn(
            "h-full w-full object-cover transition duration-700",
            playing ? "scale-110 animate-pulse opacity-100" : "scale-100 opacity-90"
          )}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-emerald-900/40 via-black to-violet-900/30" />
      )}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "absolute inset-0 flex items-center justify-center transition",
          playing ? "bg-transparent" : "bg-background/25 backdrop-blur-[2px] hover:bg-background/15"
        )}
        aria-label={playing ? "Pause trailer preview" : "Play trailer preview"}
      >
        {!playing ? (
          <span className="rounded-full border border-white/25 bg-background/70 px-6 py-3 text-sm font-medium shadow-lg backdrop-blur">
            ▶ Trailer Preview
          </span>
        ) : (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/80">
            Preview · tap to stop
          </span>
        )}
      </button>
    </div>
  );
}

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
