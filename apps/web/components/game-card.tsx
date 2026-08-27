import type { Game } from "@game-platform/shared";

import { PlatformGameCard } from "@/components/platform-game-card";
import { detailHrefForCatalogSlug, REPLAY_CARD_CTA } from "@/lib/game-catalog";
import { getGameBalanceMeta } from "@/lib/game-balance";
import { isRecentlyCreated } from "@/lib/game-sections";

/** Catalog game card — Detail only (never Character lobby). */
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

  return (
    <div className="relative">
      <PlatformGameCard
        game={game}
        isHot={isHot}
        isNew={isNew}
        actions={{
          primary: {
            label: isMaintenance ? "점검 중" : isComingSoon ? "Coming Soon" : REPLAY_CARD_CTA,
            href: detailHrefForCatalogSlug(game.slug),
          },
        }}
      />
      {!compact ? (
        <p className="sr-only">{getGameBalanceMeta(game.slug, game.difficulty).playTimeLabel}</p>
      ) : null}
    </div>
  );
}

