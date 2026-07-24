import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function GameDetailBreadcrumb({
  gameTitle,
  categoryName,
  categorySlug,
}: {
  gameTitle: string;
  categoryName?: string | null;
  categorySlug?: string | null;
}) {
  return (
    <nav
      aria-label="breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      <Link href="/" className="hover:text-foreground">
        홈
      </Link>
      <ChevronRight className="size-3.5 shrink-0 opacity-50" />
      <Link href="/games" className="hover:text-foreground">
        게임
      </Link>
      {categoryName && categorySlug ? (
        <>
          <ChevronRight className="size-3.5 shrink-0 opacity-50" />
          <Link href={`/categories/${categorySlug}`} className="hover:text-foreground">
            {categoryName}
          </Link>
        </>
      ) : null}
      <ChevronRight className="size-3.5 shrink-0 opacity-50" />
      <span className="font-medium text-foreground">{gameTitle}</span>
    </nav>
  );
}
