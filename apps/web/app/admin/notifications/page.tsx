import Link from "next/link";

import { fetchNotificationCounts } from "@/lib/supabase/ops-server";

export const metadata = { title: "Notifications" };

const CHANNELS = [
  { href: "/admin/cms/notices", label: "공지", key: "notices" as const },
  { href: "/admin/cms/banners", label: "배너", key: "banners" as const },
  { href: "/admin/cms/events", label: "이벤트", key: "events" as const },
  { href: "/admin/cms/featured", label: "추천 게임", key: "featured" as const },
];

export default async function AdminNotificationsPage() {
  const counts = await fetchNotificationCounts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Notification Center</h1>
        <p className="text-sm text-muted-foreground">
          공지 · 배너 · 이벤트 · 추천 — CMS 채널 통합 허브
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((ch) => (
          <Link
            key={ch.href}
            href={ch.href}
            className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <p className="text-lg font-semibold">{ch.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{counts[ch.key]}</p>
            <p className="mt-1 text-sm text-muted-foreground">활성 / 등록 항목</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        Push 알림 채널은 Sprint 13 (Cloud Save + Login) 이후 연동 예정.
      </section>
    </div>
  );
}
