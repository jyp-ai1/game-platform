import { Badge, Container } from "@game-platform/ui";
import type { Game, GameStatus } from "@game-platform/shared";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { GameDetailBreadcrumb } from "@/components/game-detail-breadcrumb";
import { GameDetailStage } from "@/components/game-detail-stage";
import { GamePlayer } from "@/components/game-player";
import { GameStatusBlock } from "@/components/game-status-block";
import { Leaderboard } from "@/components/leaderboard";
import { MyBestScore } from "@/components/my-best-score";
import { NostalgiaNote } from "@/components/nostalgia-note";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import { ScreenshotGallery } from "@/components/screenshot-gallery";
import { difficultyVariant } from "@/lib/difficulty";
import type { PlayableSlug } from "@/lib/playable-games";

export function GameDetailTemplate({
  game,
  slug,
  isPlayable,
}: {
  game: Game;
  slug: string;
  isPlayable: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero — compact on desktop */}
      <div className="relative border-b">
        <div className="relative h-36 w-full overflow-hidden bg-muted sm:h-44 lg:h-48">
          {game.thumbnailUrl ? (
            <Image
              src={game.thumbnailUrl}
              alt=""
              fill
              priority
              className="object-cover opacity-60 lg:opacity-40"
            />
          ) : (
            <div className="h-full bg-gradient-to-br from-primary/20 via-muted to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
        </div>

        <Container className="relative -mt-16 max-w-7xl pb-6 lg:-mt-20 lg:pb-8">
          <GameDetailBreadcrumb
            gameTitle={game.title}
            categoryName={game.category?.name}
            categorySlug={game.category?.slug}
          />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              {game.thumbnailUrl ? (
                <div className="relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-background shadow-md sm:block lg:h-24 lg:w-24">
                  <Image
                    src={game.thumbnailUrl}
                    alt={game.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {game.title}
                  </h1>
                  <FavoriteButton slug={game.slug} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={difficultyVariant[game.difficulty]}>
                    {game.difficulty}
                  </Badge>
                  {game.category ? (
                    <Link href={`/categories/${game.category.slug}`}>
                      <Badge variant="secondary">{game.category.name}</Badge>
                    </Link>
                  ) : null}
                  {game.playCount > 0 ? (
                    <span className="text-sm text-muted-foreground">
                      {game.playCount.toLocaleString()} plays
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  {game.description}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="max-w-7xl py-8 lg:py-10">
        {isPlayable ? (
          <PlayableLayout game={game} slug={slug} />
        ) : game.status !== "ACTIVE" ? (
          <BlockedLayout game={game} status={game.status} />
        ) : (
          <p className="text-sm text-muted-foreground">
            이 게임은 현재 플레이할 수 없습니다.
          </p>
        )}
      </Container>
    </main>
  );
}

function PlayableLayout({ game, slug }: { game: Game; slug: string }) {
  return (
    <>
      <div className="mb-6 lg:hidden">
        <ScreenshotGallery slug={game.slug} title={game.title} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        {/* Main — game */}
        <div className="min-w-0 space-y-6">
          <RecentlyPlayedRecorder
            slug={slug}
            categorySlug={game.category?.slug ?? null}
          />
          <GameDetailStage>
            <GamePlayer slug={slug as PlayableSlug} />
          </GameDetailStage>

          {game.howToPlay ? (
            <div className="rounded-xl border bg-card/40 p-4">
              <p className="text-sm font-medium text-foreground">플레이 방법</p>
              <p className="mt-1 text-sm text-muted-foreground">{game.howToPlay}</p>
            </div>
          ) : null}

          <MyBestScore gameSlug={slug} />
        </div>

        {/* Sidebar — ranking & meta (sticky on PC) */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="hidden lg:block">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              스크린샷
            </p>
            <ScreenshotGallery slug={game.slug} title={game.title} compact />
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm lg:p-5">
            <h2 className="mb-4 text-lg font-semibold">랭킹</h2>
            <Leaderboard gameSlug={slug} />
          </div>

          {game.nostalgiaNote ? <NostalgiaNote note={game.nostalgiaNote} /> : null}
        </aside>
      </div>
    </>
  );
}

function BlockedLayout({
  game,
  status,
}: {
  game: Game;
  status: Exclude<GameStatus, "ACTIVE">;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      {game.howToPlay ? (
        <div className="rounded-xl border bg-card/40 p-4">
          <p className="text-sm font-medium">플레이 방법</p>
          <p className="mt-1 text-sm text-muted-foreground">{game.howToPlay}</p>
        </div>
      ) : null}
      <GameStatusBlock status={status} />
    </div>
  );
}
