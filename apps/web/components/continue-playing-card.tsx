import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Gamepad2 } from "lucide-react";
import Image from "next/image";

import { GameCardPlayLink } from "@/components/game-card-play-link";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getLastPlayedAt } from "@/lib/local-storage";

// Deliberately separate from GameCard: this shows a "last played" timestamp
// and a Continue button that is just a plain link back to the game page
// (real save/resume is Sprint 9) — logic that shouldn't leak into the
// widely-reused GameCard.
export function ContinuePlayingCard({ game }: { game: Game }) {
  const lastPlayedAt = getLastPlayedAt(game.slug);

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
          {formatRelativeTime(lastPlayedAt)}
        </p>

        <div className="mt-2">
          <Button
            nativeButton={false}
            render={
              <GameCardPlayLink href={`/games/${game.slug}`}>
                ▶ Continue
              </GameCardPlayLink>
            }
          />
        </div>
      </div>
    </div>
  );
}
