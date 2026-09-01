import type { Game } from "@game-platform/shared";

import { PlatformGameCard } from "@/components/platform-game-card";
import { detailHrefForCatalogSlug, DISCOVERY_CARD_CTA } from "@/lib/game-catalog";
import { gameCreatorLabel, gameSummaryDescription } from "@/lib/game-discovery-ui";
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

  const detailHref = detailHrefForCatalogSlug(game.slug);

  return (
    <div className="relative">
      <PlatformGameCard
        game={game}
        isHot={isHot}
        isNew={isNew}
        summary={gameSummaryDescription(game, game.slug)}
        creator={gameCreatorLabel(game.slug)}
        detailHref={detailHref}
        actions={{
          primary: {
            label: isMaintenance ? "점검 중" : isComingSoon ? "Coming Soon" : DISCOVERY_CARD_CTA,
            href: detailHref,
          },
        }}
      />
      {!compact ? (
        <p className="sr-only">{getGameBalanceMeta(game.slug, game.difficulty).playTimeLabel}</p>
      ) : null}
    </div>
  );
}

