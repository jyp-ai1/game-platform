"use client";

import type { Game } from "@game-platform/shared";
import { REALTIME_GAMES } from "@game-platform/multiplayer-sdk";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { LiveMultiplayerGameCard } from "@/components/live-multiplayer-game-card";
import { PlatformGameCard } from "@/components/platform-game-card";
import { selectNew, selectPopular, selectRecommended } from "@/lib/game-sections";
import { detailHrefForCatalogSlug, REPLAY_CARD_CTA } from "@/lib/game-catalog";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
  subscribeFavorites,
  subscribeRecentlyPlayed,
} from "@/lib/local-storage";

/**
 * Sprint 17 Step 5 + Sprint 22 — home catalog strips.
 * Latest · Popular · Multiplayer · Solo · My played · Recommend
 * PLATFORM-CORE-002: Solo catalog must stay visible.
 * Honest ranking from playCount / recentlyPlayed — no fake AI.
 */
export function HomeCatalogSections({
  games,
  snakeGame,
  multiplayerGames = [],
}: {
  games: Game[];
  snakeGame: Game | null;
  multiplayerGames?: Game[];
}) {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const recentlyPlayed = useSyncExternalStore(
    subscribeRecentlyPlayed,
    getRecentlyPlayedSnapshot,
    getServerRecentlyPlayedSnapshot
  );

  const popular = selectPopular(games, 6);
  const newest = selectNew(games, 6);
  // Solo / single catalog — exclude realtime WORLD titles only (never delete Solo).
  const soloPool = games.filter((g) => !REALTIME_GAMES.has(g.slug));
  const soloPopular = selectPopular(soloPool, 6);
  const mpExtras = multiplayerGames.filter(
    (g) => g.slug !== "snake" && REALTIME_GAMES.has(g.slug)
  );
  const mpCards: Game[] = [];
  if (snakeGame) mpCards.push(snakeGame);
  mpCards.push(...mpExtras);

  const myPlayed = useMemo(() => {
    const bySlug = new Map(games.map((g) => [g.slug, g]));
    return recentlyPlayed
      .map((slug) => bySlug.get(slug))
      .filter((g): g is Game => !!g)
      .slice(0, 6);
  }, [games, recentlyPlayed]);

  const recommended = useMemo(
    () => selectRecommended(games, recentlyPlayed, favorites, 6),
    [games, recentlyPlayed, favorites]
  );

  return (
    <>
      <CatalogRow
        id="home-popular-catalog"
        title="🔥 Popular"
        subtitle="playCount 기준 정렬 · 데이터 없으면 카탈로그 순"
        href="/games?sort=popular"
      >
        {popular.map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: REPLAY_CARD_CTA, href: detailHrefForCatalogSlug(game.slug) },
            }}
          />
        ))}
      </CatalogRow>

      <CatalogRow
        id="home-new-catalog"
        title="🆕 Latest"
        subtitle="최근 등록 게임"
        href="/games?sort=newest"
      >
        {(newest.length > 0 ? newest : popular.slice(0, 4)).map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: REPLAY_CARD_CTA, href: detailHrefForCatalogSlug(game.slug) },
            }}
          />
        ))}
      </CatalogRow>

      <CatalogRow
        id="home-solo-catalog"
        title="🎯 Solo"
        subtitle="1인 플레이 · Re:Play → Detail → PLAY"
        href="/games?players=solo"
      >
        {soloPopular.map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: REPLAY_CARD_CTA, href: detailHrefForCatalogSlug(game.slug) },
            }}
          />
        ))}
      </CatalogRow>

      <section
        aria-labelledby="home-mp-catalog-heading"
        className="border-t border-white/5 py-8 sm:py-10"
        data-testid="home-multiplayer-catalog"
      >
        <Container>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="home-mp-catalog-heading" className="text-xl font-bold">
                🎮 Multiplayer
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Snake · Agar · Bomber — 같은 LIVE 카드 패턴
              </p>
            </div>
            <Link
              href="/games?players=multiplayer"
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              전체 보기 →
            </Link>
          </div>
          {mpCards.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:max-w-4xl">
              {mpCards.map((game) => (
                <LiveMultiplayerGameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">멀티플레이 게임이 없습니다.</p>
          )}
        </Container>
      </section>

      <CatalogRow
        id="home-my-played-catalog"
        title="🕹️ My played"
        subtitle="최근 플레이한 게임"
        href="/games?sort=played"
      >
        {(myPlayed.length > 0 ? myPlayed : popular.slice(0, 3)).map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: REPLAY_CARD_CTA, href: detailHrefForCatalogSlug(game.slug) },
            }}
          />
        ))}
      </CatalogRow>

      <CatalogRow
        id="home-recommend-catalog"
        title="✨ Recommend"
        subtitle="최근 플레이 · 즐겨찾기 · playCount 기반 (가짜 AI 없음)"
        href="/games?sort=recommended"
      >
        {recommended.map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: REPLAY_CARD_CTA, href: detailHrefForCatalogSlug(game.slug) },
            }}
          />
        ))}
      </CatalogRow>
    </>
  );
}

function CatalogRow({
  id,
  title,
  subtitle,
  href,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="border-t border-white/5 py-6 sm:py-8"
      data-testid={id}
    >
      <Container>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id={`${id}-heading`} className="text-xl font-bold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Link href={href} className="shrink-0 text-sm text-muted-foreground hover:text-foreground">
            더보기 →
          </Link>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">{children}</div>
      </Container>
    </section>
  );
}
