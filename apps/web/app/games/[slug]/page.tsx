import { Badge, Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/favorite-button";
import { GamePlayer } from "@/components/game-player";
import { GameSection } from "@/components/game-section";
import { GameStatusBlock } from "@/components/game-status-block";
import { Leaderboard } from "@/components/leaderboard";
import { MyBestScore } from "@/components/my-best-score";
import { NostalgiaNote } from "@/components/nostalgia-note";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import { ScreenshotGallery } from "@/components/screenshot-gallery";
import { difficultyVariant } from "@/lib/difficulty";
import { selectHotSlugs, selectRelated } from "@/lib/game-sections";
import { isPlayableSlug } from "@/lib/playable-games";
import { getGameBySlug, getGames } from "@/lib/supabase/games";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

// Revalidate periodically so newly-submitted scores show up in the
// leaderboard without requiring a redeploy (same reasoning as the home page).
export const revalidate = 60;

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return { title: "Game Not Found" };
  }

  return {
    title: game.title,
    description: game.description,
    keywords: game.tags,
    openGraph: {
      title: game.title,
      description: game.description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      description: game.description,
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const [game, allGames] = await Promise.all([getGameBySlug(slug), getGames()]);

  if (!game) {
    notFound();
  }

  if (game.status === "HIDDEN") {
    notFound();
  }

  const related = selectRelated(allGames, game);
  const hotSlugs = selectHotSlugs(allGames);
  const isPlayable = game.status === "ACTIVE" && isPlayableSlug(slug);

  return (
    <main className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            name: game.title,
            description: game.description,
            genre: game.category?.name,
            applicationCategory: "Game",
            ...(game.thumbnailUrl ? { image: game.thumbnailUrl } : {}),
          }),
        }}
      />

      <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64">
        {game.thumbnailUrl ? (
          <Image
            src={game.thumbnailUrl}
            alt={game.title}
            fill
            priority
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <Container className="flex flex-1 flex-col py-16">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {game.title}
          </h1>
          <Badge variant={difficultyVariant[game.difficulty]}>
            {game.difficulty}
          </Badge>
          {game.category ? (
            <Link href={`/categories/${game.category.slug}`}>
              <Badge variant="secondary">{game.category.name}</Badge>
            </Link>
          ) : null}
          <FavoriteButton slug={game.slug} />
        </div>

        <p className="mt-3 max-w-xl text-muted-foreground">
          {game.description}
        </p>

        <div className="mt-6 max-w-3xl">
          <ScreenshotGallery slug={game.slug} title={game.title} />
        </div>

        {isPlayable ? (
          <div className="mt-8">
            <RecentlyPlayedRecorder
              slug={slug}
              categorySlug={game.category?.slug ?? null}
            />
            <GamePlayer slug={slug} />

            {game.howToPlay ? (
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  플레이 방법 ·{" "}
                </span>
                {game.howToPlay}
              </p>
            ) : null}

            <div className="mt-4">
              <MyBestScore gameSlug={slug} />
            </div>

            <div className="mt-12 max-w-sm">
              <SectionTitle title="랭킹" />
              <div className="mt-4">
                <Leaderboard gameSlug={slug} />
              </div>
            </div>

            {game.nostalgiaNote ? (
              <div className="mt-12">
                <NostalgiaNote note={game.nostalgiaNote} />
              </div>
            ) : null}
          </div>
        ) : game.status !== "ACTIVE" ? (
          <>
            {game.howToPlay ? (
              <p className="mt-6 max-w-xl text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  플레이 방법 ·{" "}
                </span>
                {game.howToPlay}
              </p>
            ) : null}
            <GameStatusBlock status={game.status} />
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            이 게임은 현재 플레이할 수 없습니다.
          </p>
        )}
      </Container>

      <GameSection title="비슷한 게임" games={related} hotSlugs={hotSlugs} />
    </main>
  );
}
