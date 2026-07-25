"use client";

import {
  getServerHasSaveSnapshot,
  hasSave,
  subscribeSave,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Gamepad2, Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useSyncExternalStore } from "react";

import { GameCardPlayLink } from "@/components/game-card-play-link";
import { useMounted } from "@/lib/use-mounted";

export function ContinuePlayingCard({
  game,
  featured = false,
}: {
  game: Game;
  featured?: boolean;
}) {
  const mounted = useMounted();
  const subscribe = useCallback(
    (listener: () => void) => subscribeSave(game.slug, listener),
    [game.slug]
  );
  const saved = useSyncExternalStore(
    subscribe,
    () => hasSave(game.slug),
    getServerHasSaveSnapshot
  );

  if (featured) {
    return (
      <div className="group relative overflow-hidden rounded-3xl border border-primary/25 bg-card/80 shadow-xl shadow-primary/10 backdrop-blur">
        <div className="relative aspect-[2/1] min-h-[180px] sm:min-h-[220px]">
          {game.thumbnailUrl ? (
            <Image
              src={game.thumbnailUrl}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <Gamepad2 className="size-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-5 sm:p-6">
            <h3 className="text-2xl font-bold sm:text-3xl">{game.title}</h3>
            <Button
              size="lg"
              className="gap-2 shadow-lg"
              nativeButton={false}
              render={
                <GameCardPlayLink href={`/games/${game.slug}`}>
                  <Play className="size-4 fill-current" />
                  {saved ? "Continue" : "Play"}
                </GameCardPlayLink>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {game.thumbnailUrl ? (
          <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Gamepad2 className="size-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <h3 className="font-semibold">{game.title}</h3>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <GameCardPlayLink href={`/games/${game.slug}`}>
              {mounted && saved ? "Continue" : "Play"}
            </GameCardPlayLink>
          }
        />
      </div>
    </div>
  );
}
