import type { Game } from "@game-platform/shared";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";

export function GameDetailHero({ game }: { game: Game }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10">
      <div className="relative aspect-[21/9] min-h-[140px] bg-muted">
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
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-5">
          <h1 className="text-2xl font-bold sm:text-3xl">{game.title}</h1>
          <FavoriteButton slug={game.slug} />
        </div>
      </div>
      {game.category ? (
        <Link
          href={`/categories/${game.category.slug}`}
          className="absolute right-5 top-5 rounded-full bg-background/60 px-3 py-1 text-xs backdrop-blur"
        >
          {game.category.name}
        </Link>
      ) : null}
    </div>
  );
}
