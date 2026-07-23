"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import { deleteEvent, upsertEvent } from "@/app/admin/cms/actions";

type EventRow = {
  id: string;
  title: string;
  description: string;
  game_slug: string | null;
  reward_text: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export function EventManager({
  events,
  gameSlugs,
}: {
  events: EventRow[];
  gameSlugs: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertEvent({
          title: formData.get("title") as string,
          description: (formData.get("description") as string) || "",
          game_slug: (formData.get("game_slug") as string) || undefined,
          reward_text: (formData.get("reward_text") as string) || undefined,
          starts_at: formData.get("starts_at") as string,
          ends_at: formData.get("ends_at") as string,
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
        <h2 className="font-semibold">이벤트 추가</h2>
        <input name="title" placeholder="제목" required className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <textarea name="description" placeholder="설명" rows={3} className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <select name="game_slug" className="w-full rounded border bg-background px-3 py-2 text-sm">
          <option value="">게임 없음</option>
          {gameSlugs.map((slug) => (
            <option key={slug} value={slug}>{slug}</option>
          ))}
        </select>
        <input name="reward_text" placeholder="보상 설명" className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="starts_at" type="datetime-local" required className="rounded border bg-background px-3 py-2 text-sm" />
          <input name="ends_at" type="datetime-local" required className="rounded border bg-background px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="is_active" type="checkbox" defaultChecked />
          노출
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          추가
        </button>
      </form>
      <ul className="divide-y rounded-xl border">
        {events.map((ev) => (
          <li key={ev.id} className="flex justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{ev.title}</p>
              <p className="text-sm text-muted-foreground">{ev.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ev.game_slug ?? "—"} · {ev.is_active ? "ON" : "OFF"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startTransition(async () => { await deleteEvent(ev.id); router.refresh(); })}
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
