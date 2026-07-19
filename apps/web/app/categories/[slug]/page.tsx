import { Container, SectionTitle } from "@game-platform/ui";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { GameCard } from "@/components/game-card";
import { GameSection } from "@/components/game-section";
import { getCategoryBySlug } from "@/lib/supabase/categories";
import { getGames } from "@/lib/supabase/games";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category ? `${category.name} 게임` : "카테고리" };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [category, games] = await Promise.all([
    getCategoryBySlug(slug),
    getGames(),
  ]);

  if (!category) {
    notFound();
  }

  const filtered = games.filter((game) => game.categoryId === category.id);
  const featuredGame = category.featuredGameId
    ? filtered.find((game) => game.id === category.featuredGameId)
    : undefined;
  const rest = featuredGame
    ? filtered.filter((game) => game.id !== featuredGame.id)
    : filtered;

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative h-40 w-full overflow-hidden bg-muted sm:h-56">
        {category.bannerUrl ? (
          <Image
            src={category.bannerUrl}
            alt={category.name}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 via-background to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>

      <div className="py-16">
        <Container>
          <SectionTitle
            title={`${category.name} 게임`}
            description={
              category.description ?? `${category.name} 카테고리의 게임 목록입니다.`
            }
          />
        </Container>

        {featuredGame ? (
          <Container className="mt-8">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              대표 게임
            </p>
            <div className="max-w-sm">
              <GameCard game={featuredGame} />
            </div>
          </Container>
        ) : null}

        <div className="mt-12">
          <GameSection title="전체 게임" games={rest} />
        </div>
      </div>
    </main>
  );
}
