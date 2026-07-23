"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import { deleteFeatured, upsertFeatured } from "@/app/admin/cms/actions";

const SLOTS = [
  { value: "weekly_pick", label: "이번주 추천" },
  { value: "editors_pick", label: "Editor's Pick" },
  { value: "trending", label: "Trending" },
  { value: "new_games", label: "신규게임" },
  { value: "popular", label: "인기게임" },
];

type Featured = {
  id: string;
  slot: string;
  game_slug: string;
  sort_order: number;
  is_active: boolean;
  games: { title: string } | null;
};

export function FeaturedManager({ items, gameSlugs }: { items: Featured[]; gameSlugs: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertFeatured({
          slot: formData.get("slot") as string,
          game_slug: formData.get("game_slug") as string,
          sort_order: Number(formData.get("sort_order") || 0),
          is_active: formData.get("is_active") === "on",
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-8">
      <form action={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">추천 게임 추가</h2>
        <select name="slot" className="w-full rounded border bg-background px-3 py-2 text-sm">
          {SLOTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select name="game_slug" required className="w-full rounded border bg-background px-3 py-2 text-sm">
          {gameSlugs.map((slug) => (
            <option key={slug} value={slug}>{slug}</option>
          ))}
        </select>
        <input name="sort_order" type="number" defaultValue={0} className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input name="is_active" type="checkbox" defaultChecked />
          활성
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          추가
        </button>
      </form>
      <ul className="divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between p-4">
            <span>
              <span className="text-xs text-primary">{item.slot}</span>
              {" · "}
              {item.games?.title ?? item.game_slug}
              {" · 순서 "}
              {item.sort_order}
            </span>
            <button
              type="button"
              onClick={() => startTransition(async () => { await deleteFeatured(item.id); router.refresh(); })}
              className="text-sm text-red-400"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
