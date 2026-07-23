"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateCategoryOrder } from "@/app/admin/cms/actions";

type Cat = { slug: string; name: string; sort_order: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(slug: string, sortOrder: number) {
    startTransition(async () => {
      await updateCategoryOrder(slug, sortOrder);
      router.refresh();
    });
  }

  return (
    <ul className="space-y-2">
      {categories.map((c) => (
        <li key={c.slug} className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <span className="flex-1 font-medium">{c.name}</span>
          <input
            type="number"
            defaultValue={c.sort_order}
            disabled={pending}
            onBlur={(e) => save(c.slug, Number(e.target.value))}
            className="w-20 rounded border bg-background px-2 py-1 text-sm"
          />
        </li>
      ))}
    </ul>
  );
}
