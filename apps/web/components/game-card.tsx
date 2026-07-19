import type { Game } from "@game-platform/shared";
import { Badge, Button } from "@game-platform/ui";
import { Gamepad2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { difficultyVariant } from "@/lib/difficulty";

export function GameCard({ game }: { game: Game }) {
  const isComingSoon = game.status === "COMING_SOON";

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
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

        <FavoriteButton slug={game.slug} className="absolute left-2 top-2" />

        {isComingSoon ? (
          <Badge className="absolute right-2 top-2">Coming Soon</Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{game.title}</h3>
          <Badge variant={difficultyVariant[game.difficulty]}>
            {game.difficulty}
          </Badge>
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
