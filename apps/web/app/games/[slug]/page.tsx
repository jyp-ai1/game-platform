import { Badge, Button, Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/favorite-button";
import { GamePlayer } from "@/components/game-player";
import { GameSection } from "@/components/game-section";
import { Leaderboard } from "@/components/leaderboard";
import { MyBestScore } from "@/components/my-best-score";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import { difficultyVariant } from "@/lib/difficulty";
import { selectRelated } from "@/lib/game-sections";
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

  const images = game.thumbnailUrl ? [game.thumbnailUrl] : undefined;

  return {
    title: game.title,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      description: game.description,
      ...(images ? { images } : {}),
    },
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const [game, allGames] = await Promise.all([getGameBySlug(slug), getGames()]);

  if (!game) {
    notFound();
  }

  const related = selectRelated(allGames, game);
  const isPlayable = game.status === "ACTIVE" && isPlayableSlug(slug);

  return (
    <main className="flex flex-1 flex-col">
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

        {isPlayable ? <MyBestScore gameSlug={slug} /> : null}

        {game.howToPlay ? (
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            <span className="font-medium text-foreground">플레이 방법 · </span>
            {game.howToPlay}
          </p>
        ) : null}

        {isPlayable ? (
          <div className="mt-8">
            <RecentlyPlayedRecorder slug={slug} />
            <GamePlayer slug={slug} />

            <div className="mt-12 max-w-sm">
              <SectionTitle title="랭킹" />
              <div className="mt-4">
                <Leaderboard gameSlug={slug} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              이 게임은 아직 플레이할 수 없습니다. 곧 만나보실 수 있습니다.
            </p>
            <Button
              variant="outline"
              className="mt-8 w-fit"
              nativeButton={false}
              render={<Link href="/#games">다른 게임 둘러보기</Link>}
            />
          </>
        )}
      </Container>

      <GameSection title="관련 게임" games={related} />
    </main>
  );
}
