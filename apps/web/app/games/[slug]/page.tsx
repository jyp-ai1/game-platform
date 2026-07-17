import { Badge, Button, Container } from "@game-platform/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/favorite-button";
import { GamePlayer } from "@/components/game-player";
import { GameSection } from "@/components/game-section";
import { RecentlyPlayedRecorder } from "@/components/recently-played-recorder";
import { difficultyVariant } from "@/lib/difficulty";
import { selectRelated } from "@/lib/game-sections";
import { isPlayableSlug } from "@/lib/playable-games";
import { getGameBySlug, getGames } from "@/lib/supabase/games";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

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

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col py-16">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {game.title}
          </h1>
          <Badge variant={difficultyVariant[game.difficulty]}>
            {game.difficulty}
          </Badge>
          <FavoriteButton slug={game.slug} />
        </div>

        <p className="mt-3 max-w-xl text-muted-foreground">
          {game.description}
        </p>

        {game.status === "ACTIVE" && isPlayableSlug(slug) ? (
          <div className="mt-8">
            <RecentlyPlayedRecorder slug={slug} />
            <GamePlayer slug={slug} />
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
