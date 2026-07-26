import type { Game } from "@game-platform/shared";

import { PlatformGameCard } from "@/components/platform-game-card";
import { getGameBalanceMeta } from "@/lib/game-balance";
import { isRecentlyCreated } from "@/lib/game-sections";

/** Catalog game card — delegates to unified PlatformGameCard. */
export function GameCard({
  game,
  isHot,
  compact = false,
}: {
  game: Game;
  isHot?: boolean;
  compact?: boolean;
}) {
  const isComingSoon = game.status === "COMING_SOON";
  const isMaintenance = game.status === "MAINTENANCE";
  const isNew = !isComingSoon && !isMaintenance && isRecentlyCreated(game.createdAt);
  const isSnake = game.slug === "snake";

  if (isSnake && !isComingSoon && !isMaintenance) {
    return (
      <PlatformGameCard
        game={game}
        isHot={isHot}
        isNew={isNew}
        actions={{
          primary: { label: "플레이", href: `/games/${game.slug}` },
        }}
      />
    );
  }

  return (
    <div className="relative">
      <PlatformGameCard
        game={game}
        isHot={isHot}
        isNew={isNew}
        actions={{
          primary: {
            label: isMaintenance ? "점검 중" : isComingSoon ? "Coming Soon" : "플레이",
            href: `/games/${game.slug}`,
          },
        }}
      />
      {!compact ? (
        <p className="sr-only">{getGameBalanceMeta(game.slug, game.difficulty).playTimeLabel}</p>
      ) : null}
    </div>
  );
}
