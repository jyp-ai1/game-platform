import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  return (
    <main className="flex flex-1 flex-col py-16">
      <GameSection
        title={`${category.name} 게임`}
        description={`${category.name} 카테고리의 게임 목록입니다.`}
        games={filtered}
      />
    </main>
  );
}
