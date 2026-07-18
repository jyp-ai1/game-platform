import { Container } from "@game-platform/ui";
import Link from "next/link";

import { getCategories } from "@/lib/supabase/categories";

export async function CategoryLinks() {
  const categories = await getCategories();

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="border-b py-8">
      <Container className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            {category.name}
          </Link>
        ))}
      </Container>
    </section>
  );
}
