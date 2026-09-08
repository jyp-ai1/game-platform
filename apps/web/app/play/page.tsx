import type { Metadata } from "next";

import { FlagshipCatalog } from "@/components/flagship-catalog";
import { Container } from "@game-platform/ui";

import { mergeCatalogGames } from "@/lib/creator/creator-game-catalog";
import { buildLocalMvpGame } from "@/lib/local-mvp-games";
import {
  PRODUCT_FLAGSHIP_SLUGS,
  selectOfficialProductGames,
} from "@/lib/product-catalog-sync";
import { getGames } from "@/lib/supabase/games";

export const metadata: Metadata = {
  title: "Re:Play",
  description: "Official games — Snake, Agar, Bomber, Re:Front",
  robots: { index: false, follow: false },
};

export const revalidate = 60;

export default async function FlagshipCatalogPage() {
  const merged = mergeCatalogGames(await getGames());
  const fromDb = selectOfficialProductGames(merged);
  const games = PRODUCT_FLAGSHIP_SLUGS.map((slug) => {
    return fromDb.find((g) => g.slug === slug) ?? buildLocalMvpGame(slug);
  }).filter((g): g is NonNullable<typeof g> => !!g);

  return (
    <main className="flex flex-1 flex-col py-12">
      <Container className="max-w-3xl">
        <FlagshipCatalog games={games} />
      </Container>
    </main>
  );
}
