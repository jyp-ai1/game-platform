import type { Game } from "@game-platform/shared";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";

export function GameDetailHero({
  game,
  creator,
}: {
  game: Game;
  creator?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10">
      <div className="relative aspect-[21/9] min-h-[120px] bg-muted sm:min-h-[140px]">
        {game.thumbnailUrl ? (
          <Image
            src={game.thumbnailUrl}
            alt=""
            fill
            unoptimized={game.thumbnailUrl.startsWith("/images/")}
            className="object-cover opacity-90"
            priority
          />
        ) : null}
        <div className="hero-neon-glow pointer-events-none absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0 text-left">
            <h1 className="text-xl font-bold leading-tight sm:text-3xl">{game.title}</h1>
            {creator ? (
              <p
                data-testid="game-detail-hero-creator"
                className="mt-1 text-xs text-muted-foreground sm:text-sm"
              >
                by {creator}
              </p>
            ) : null}
          </div>
          <FavoriteButton slug={game.slug} />
        </div>
      </div>
      {game.category ? (
        <Link
          href={`/categories/${game.category.slug}`}
          className="absolute right-4 top-4 rounded-full bg-background/60 px-3 py-1 text-xs backdrop-blur sm:right-5 sm:top-5"
        >
          {game.category.name}
        </Link>
      ) : null}
    </div>
  );
}
