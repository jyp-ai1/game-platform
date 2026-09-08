import type { Game } from "@game-platform/shared";
import Image from "next/image";
import Link from "next/link";

import { productFlagshipFeatures, productModeLabel } from "@/lib/product-catalog-sync";

/** Official 4-game Product Catalog — ANOTHER GAME landing (not Discover). */
export function FlagshipCatalog({ games }: { games: Game[] }) {
  return (
    <section data-testid="flagship-catalog" className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Re:Play</h1>
        <p className="mt-2 text-sm text-muted-foreground">Official games · pick one to enter</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {games.map((game) => {
          const mode = productModeLabel(game.slug);
          return (
            <li key={game.slug}>
              <Link
                href={`/games/${game.slug}`}
                data-testid={`flagship-catalog-${game.slug}`}
                className="flex overflow-hidden rounded-2xl border border-white/10 bg-card/40 transition hover:border-white/25 hover:bg-card/70"
              >
                <div className="relative h-28 w-36 shrink-0 bg-muted sm:h-32 sm:w-44">
                  {game.thumbnailUrl ? (
                    <Image
                      src={game.thumbnailUrl}
                      alt=""
                      fill
                      unoptimized={game.thumbnailUrl.startsWith("/images/")}
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3 text-left">
                  <p className="truncate text-base font-semibold">{game.title}</p>
                  {mode ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                      {mode}
                    </p>
                  ) : null}
                  <p className="text-xs font-medium text-cyan-200/90">ENTER WORLD</p>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {productFlagshipFeatures(game.slug)[0] ?? "DETAIL → ENTER WORLD"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
