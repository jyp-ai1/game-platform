"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteBanner, upsertBanner } from "@/app/admin/cms/actions";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertBanner({
          id: (formData.get("id") as string) || undefined,
          title: formData.get("title") as string,
          image_url: formData.get("image_url") as string,
          link_url: (formData.get("link_url") as string) || undefined,
          button_text: (formData.get("button_text") as string) || undefined,
          sort_order: Number(formData.get("sort_order") || 0),
          starts_at: (formData.get("starts_at") as string) || undefined,
          ends_at: (formData.get("ends_at") as string) || undefined,
          is_active: formData.get("is_active") === "on",
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBanner(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form action={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">새 배너 추가</h2>
        <input name="title" placeholder="제목" required className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <input name="image_url" placeholder="이미지 URL" required className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <input name="link_url" placeholder="링크 URL" className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <input name="button_text" placeholder="버튼명" className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <input name="sort_order" type="number" defaultValue={0} placeholder="순서" className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="starts_at" type="datetime-local" className="rounded border bg-background px-3 py-2 text-sm" />
          <input name="ends_at" type="datetime-local" className="rounded border bg-background px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="is_active" type="checkbox" defaultChecked />
          공개
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          추가
        </button>
      </form>

      <ul className="space-y-3">
        {banners.map((b) => (
          <li key={b.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.image_url}</p>
              <p className="mt-1 text-sm">
                순서 {b.sort_order} · {b.is_active ? "ON" : "OFF"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(b.id)}
              disabled={pending}
              className="text-sm text-red-400 hover:underline"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
