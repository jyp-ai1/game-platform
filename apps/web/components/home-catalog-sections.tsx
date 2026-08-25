"use client";

import type { Game } from "@game-platform/shared";
import { REALTIME_GAMES } from "@game-platform/multiplayer-sdk";
import { Container } from "@game-platform/ui";
import Link from "next/link";

import { LiveMultiplayerGameCard } from "@/components/live-multiplayer-game-card";
import { PlatformGameCard } from "@/components/platform-game-card";
import { selectNew, selectPopular } from "@/lib/game-sections";
import { playHrefForCatalogSlug } from "@/lib/game-catalog";

/**
 * Sprint 17 Step 5 — home catalog strips (인기 / 최신 / Multiplayer).
 * Reuses PlatformGameCard + LiveMultiplayerGameCard; no fake AI ranking.
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
  const popular = selectPopular(games, 6);
  const newest = selectNew(games, 6);
  const mpExtras = multiplayerGames.filter(
    (g) => g.slug !== "snake" && REALTIME_GAMES.has(g.slug)
  );
  const mpCards: Game[] = [];
  if (snakeGame) mpCards.push(snakeGame);
  mpCards.push(...mpExtras);

  return (
    <>
      <CatalogRow
        id="home-popular-catalog"
        title="🔥 인기"
        subtitle="playCount 기준 정렬 · 데이터 없으면 카탈로그 순"
        href="/games?sort=popular"
      >
        {popular.map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: "PLAY", href: playHrefForCatalogSlug(game.slug) },
            }}
          />
        ))}
      </CatalogRow>

      <CatalogRow
        id="home-new-catalog"
        title="🆕 최신"
        subtitle="최근 등록 게임"
        href="/games?sort=newest"
      >
        {(newest.length > 0 ? newest : popular.slice(0, 4)).map((game) => (
          <PlatformGameCard
            key={game.id}
            game={game}
            className="min-w-[240px] max-w-[280px] shrink-0"
            actions={{
              primary: { label: "PLAY", href: playHrefForCatalogSlug(game.slug) },
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
