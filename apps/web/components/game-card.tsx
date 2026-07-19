import type { Game } from "@game-platform/shared";
import { Badge, Button, cn } from "@game-platform/ui";
import { Gamepad2, Play, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CardBestScore } from "@/components/card-best-score";
import { FavoriteButton } from "@/components/favorite-button";
import { difficultyVariant } from "@/lib/difficulty";
import { isRecentlyCreated } from "@/lib/game-sections";

export function GameCard({
  game,
  isHot,
}: {
  game: Game;
  isHot?: boolean;
}) {
  const isComingSoon = game.status === "COMING_SOON";
  const isNew = !isComingSoon && isRecentlyCreated(game.createdAt);

  return (
    <div className="animate-in fade-in group flex flex-col overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {game.thumbnailUrl ? (
          <Image
            src={game.thumbnailUrl}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Gamepad2 className="size-10 text-muted-foreground" />
          </div>
        )}

        {/* Painted before the favorite button/badges below (DOM order),
            so this full-cover overlay never intercepts their clicks even
            though it's invisible-but-hit-testable at opacity-0. */}
        {!isComingSoon ? (
          <Link
            href={`/games/${game.slug}`}
            aria-label={`${game.title} 플레이`}
            className={cn(
              "card-play-overlay absolute inset-0 z-0 flex items-center justify-center bg-background/40 opacity-0 backdrop-blur-[1px] transition-all duration-200",
              "scale-90 group-hover:scale-100 group-hover:opacity-100"
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="size-6 fill-current" />
            </span>
          </Link>
        ) : null}

        <FavoriteButton
          slug={game.slug}
          className="absolute left-2 top-2 z-10"
        />

        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
          {isComingSoon ? <Badge>Coming Soon</Badge> : null}
          {isNew ? (
            <Badge className="bg-brand-amber text-background">NEW</Badge>
          ) : null}
          {isHot ? <Badge variant="destructive">HOT</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{game.title}</h3>
          <Badge variant={difficultyVariant[game.difficulty]}>
            {game.difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {game.playCount.toLocaleString()}
          </p>
          <CardBestScore slug={game.slug} />
        </div>

        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
          {game.description}
        </p>

        <Button
          className="mt-2"
          nativeButton={false}
          render={
            <Link href={`/games/${game.slug}`}>
              {isComingSoon ? "Coming Soon" : "Play"}
            </Link>
          }
        />
      </div>
    </div>
  );
}
