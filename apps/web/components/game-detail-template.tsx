import { Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";
import Link from "next/link";

import { GameDetailComments, GameDetailShare } from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailHero } from "@/components/game-detail-hero";
import { GameDetailRecentStrip } from "@/components/game-detail-recent-strip";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailPatchNotes } from "@/components/game-detail-patch-notes";
import { GameStatusBlock } from "@/components/game-status-block";
import { InviteDetailPin } from "@/components/invite-detail-pin";
import { MpWorldPlayLink } from "@/components/snake-world-play-link";
import { playHrefForCatalogSlug, REPLAY_DETAIL_SOLO_CTA, REPLAY_DETAIL_WORLD_CTA } from "@/lib/game-catalog";
import {
  gameCreatorLabel,
  gameSummaryDescription,
  isDiscoveryMultiplayerSlug,
} from "@/lib/game-discovery-ui";

function popularityLabel(game: Game, slug: string): string {
  const plays = game.playCount ?? 0;
  if (isDiscoveryMultiplayerSlug(slug)) {
    return `🔥 LIVE · ${(plays > 0 ? plays : 12_400).toLocaleString()} plays`;
  }
  return `Play count · ${plays.toLocaleString()}`;
}

export function GameDetailTemplate({
  game,
  slug,
  isPlayable,
  rankingEnabled = true,
  related: _related = [],
  allGames = [],
  inviteCode = null,
}: {
  game: Game;
  slug: string;
  isPlayable: boolean;
  rankingEnabled?: boolean;
  related?: Game[];
  allGames?: Game[];
  /** Sprint 21 — pin invite on Detail; WORLD PLAY joins same room. */
  inviteCode?: string | null;
}) {
  const desc = gameSummaryDescription(game, slug, 120);
  const creator = gameCreatorLabel(slug);
  const playHref = playHrefForCatalogSlug(slug);
  const mp = isDiscoveryMultiplayerSlug(slug);

  return (
    <main className="flex flex-1 flex-col" data-testid="game-detail-page">
      <Container className="max-w-3xl space-y-4 py-4 sm:space-y-5 sm:py-6">
        <GameDetailHero game={game} creator={creator} />

        {isPlayable ? (
          <>
            <InviteDetailPin invite={inviteCode} gameSlug={slug} />

            <section
              className="rounded-2xl border border-white/10 bg-card/40 p-4 text-center backdrop-blur sm:p-5"
              data-testid="game-detail-play-panel"
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                {mp ? (
                  <span
                    data-testid="game-detail-mp-badge"
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200"
                  >
                    👥 Multiplayer
                  </span>
                ) : null}
                <span
                  data-testid="game-detail-creator"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground"
                >
                  Creator · {creator}
                </span>
              </div>

              <div className="mt-4 flex flex-col items-center gap-2">
                {mp && (slug === "snake" || slug === "agar" || slug === "bomber") ? (
                  <MpWorldPlayLink
                    slug={slug as "snake" | "agar" | "bomber"}
                    data-testid="game-detail-play-cta"
                    className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-xl bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[240px]"
                  >
                    {REPLAY_DETAIL_WORLD_CTA}
                  </MpWorldPlayLink>
                ) : (
                  <Link
                    href={playHref}
                    data-testid="game-detail-play-cta"
                    className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-xl bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[240px]"
                  >
                    {REPLAY_DETAIL_SOLO_CTA}
                  </Link>
                )}
                {mp ? (
                  <p className="text-xs text-muted-foreground">Character → Color → ENTER</p>
                ) : null}
              </div>

              <p
                data-testid="game-detail-description"
                className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"
              >
                {desc}
              </p>
              <p
                data-testid="game-detail-popularity"
                className="mt-2 text-xs text-muted-foreground tabular-nums"
              >
                {popularityLabel(game, slug)}
              </p>

              <div className="mx-auto mt-4 w-full max-w-sm" data-testid="game-detail-share">
                <GameDetailShare gameSlug={slug} title={game.title} />
              </div>
            </section>

            {allGames.length > 0 ? (
              <GameDetailRecentStrip games={allGames} currentSlug={slug} />
            ) : null}

            {rankingEnabled ? <GameDetailGlobalRanking gameSlug={slug} /> : null}
            <GameDetailFriendRecord gameSlug={slug} />

            <section
              className="space-y-3"
              aria-labelledby="game-detail-community-heading"
              data-testid="game-detail-community"
            >
              <div className="border-t border-white/10 pt-4">
                <h2 id="game-detail-community-heading" className="text-lg font-semibold">
                  Community
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {game.title}에 대한 생각을 남겨 보세요.
                </p>
              </div>
              <GameDetailComments gameSlug={slug} />
            </section>

            <GameDetailPatchNotes game={game} />
          </>
        ) : game.status !== "ACTIVE" ? (
          <GameStatusBlock status={game.status as Exclude<GameStatus, "ACTIVE">} />
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </Container>
    </main>
  );
}
