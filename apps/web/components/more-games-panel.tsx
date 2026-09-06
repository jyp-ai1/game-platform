import type { Game } from "@game-platform/shared";
import Link from "next/link";

import { playHrefForCatalogSlug } from "@/lib/game-catalog";
import { gameSummaryDescription } from "@/lib/game-discovery-ui";

/** Compact catalog picks — real games only, no fake metrics. */
export function MoreGamesPanel({
  games,
  currentSlug,
  title = "MORE GAMES",
}: {
  games: Game[];
  currentSlug?: string;
  title?: string;
}) {
  const picks = games
    .filter((g) => g.slug !== currentSlug && g.status === "ACTIVE")
    .slice(0, 3);
  if (picks.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-card/30 p-4 backdrop-blur"
      data-testid="more-games-panel"
      aria-labelledby="more-games-heading"
    >
      <h2 id="more-games-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {picks.map((game) => (
          <li
            key={game.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{game.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {gameSummaryDescription(game, game.slug, 48)}
              </p>
            </div>
            <Link
              href={playHrefForCatalogSlug(game.slug)}
              data-testid={`more-games-play-${game.slug}`}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:brightness-110"
            >
              PLAY
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
