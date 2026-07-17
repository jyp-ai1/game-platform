import type { Difficulty } from "@game-platform/shared";
import { Badge, Button, Container } from "@game-platform/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGameBySlug } from "@/lib/supabase/games";

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

const difficultyVariant: Record<
  Difficulty,
  "secondary" | "outline" | "destructive"
> = {
  EASY: "secondary",
  MEDIUM: "outline",
  HARD: "destructive",
};

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
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col justify-center py-24">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {game.title}
          </h1>
          <Badge variant={difficultyVariant[game.difficulty]}>
            {game.difficulty}
          </Badge>
        </div>

        <p className="mt-3 max-w-xl text-muted-foreground">
          {game.description}
        </p>

        <p className="mt-6 text-sm font-medium text-muted-foreground">
          이 게임은 아직 플레이할 수 없습니다. 곧 만나보실 수 있습니다.
        </p>

        <Button
          variant="outline"
          className="mt-8 w-fit"
          nativeButton={false}
          render={<Link href="/#games">다른 게임 둘러보기</Link>}
        />
      </Container>
    </main>
  );
}
