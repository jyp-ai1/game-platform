"use client";

import {
  getBestScore,
  getLevel,
  getServerHasSaveSnapshot,
  hasSave,
  subscribeSave,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Gamepad2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useSyncExternalStore } from "react";

import { GameCardPlayLink } from "@/components/game-card-play-link";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getLastPlayedAt } from "@/lib/local-storage";

// Deliberately separate from GameCard: this shows a "last played" timestamp
// and a button whose label honestly reflects whether a real save exists —
// "이어하기" only appears once Sprint 9's Save SDK actually has progress to
// restore; otherwise it reads "플레이" rather than falsely promising Continue.
export function ContinuePlayingCard({ game }: { game: Game }) {
  const lastPlayedAt = getLastPlayedAt(game.slug);
  const subscribe = useCallback(
    (listener: () => void) => subscribeSave(game.slug, listener),
    [game.slug]
  );
  const saved = useSyncExternalStore(
    subscribe,
    () => hasSave(game.slug),
    getServerHasSaveSnapshot
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {game.thumbnailUrl ? (
          <Image
            src={game.thumbnailUrl}
            alt={game.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Gamepad2 className="size-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold">{game.title}</h3>
        <p className="text-xs text-muted-foreground">
          Lv.{getLevel()}
          {getBestScore(game.slug) > 0
            ? ` · 최고 ${getBestScore(game.slug).toLocaleString()}점`
            : ""}
          {" · "}
          {formatRelativeTime(lastPlayedAt)}
        </p>

        <div className="mt-2">
          <Button
            nativeButton={false}
            render={
              <GameCardPlayLink href={`/games/${game.slug}`}>
                {saved ? "▶ 이어하기" : "▶ 플레이"}
              </GameCardPlayLink>
            }
          />
        </div>
      </div>
    </div>
  );
}
