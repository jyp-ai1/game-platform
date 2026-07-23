"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import { deleteNotice, upsertNotice } from "@/app/admin/cms/actions";

type Notice = {
  id: string;
  notice_type: string;
  title: string;
  body: string;
  is_active: boolean;
};

export function NoticeManager({ notices }: { notices: Notice[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertNotice({
          notice_type: formData.get("notice_type") as string,
          title: formData.get("title") as string,
          body: formData.get("body") as string,
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
        <h2 className="font-semibold">공지 추가</h2>
        <select name="notice_type" className="w-full rounded border bg-background px-3 py-2 text-sm">
          <option value="normal">일반</option>
          <option value="urgent">긴급</option>
          <option value="maintenance">점검</option>
          <option value="update">업데이트</option>
          <option value="event">이벤트</option>
        </select>
        <input name="title" placeholder="제목" required className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <textarea name="body" placeholder="내용" rows={4} className="w-full rounded border bg-background px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input name="is_active" type="checkbox" defaultChecked />
          공개
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          추가
        </button>
      </form>
      <ul className="divide-y rounded-xl border">
        {notices.map((n) => (
          <li key={n.id} className="flex justify-between gap-4 p-4">
            <div>
              <span className="text-xs uppercase text-primary">{n.notice_type}</span>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
            </div>
            <button
              type="button"
              onClick={() => startTransition(async () => { await deleteNotice(n.id); router.refresh(); })}
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
