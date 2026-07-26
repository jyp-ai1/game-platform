"use client";

import Link from "next/link";

import { getMyCreatorGames } from "@/lib/creator/creator-store";
import { getCreatorAnalytics, getStudioDashboardStats } from "@/lib/creator/creator-analytics";
import { useMounted } from "@/lib/use-mounted";

export function CreatorStudioDashboard() {
  const mounted = useMounted();
  if (!mounted) return null;

  const games = getMyCreatorGames();
  const analytics = getCreatorAnalytics(games.map((g) => ({ slug: g.slug, title: g.title })));
  const stats = getStudioDashboardStats(analytics);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Creator Studio</h1>
        <p className="text-sm text-muted-foreground">Steam보다 쉽게 — 게임을 올리고, 분석하고, 운영하세요.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashStat label="오늘 플레이" value={String(stats.todayPlays)} />
        <DashStat label="평균 플레이" value={`${stats.avgSessionMin}분`} />
        <DashStat label="재방문" value={`${stats.returnRate}%`} />
        <DashStat label="좋아요" value={`${stats.likeRate}%`} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/studio/upload" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">
          + Upload Game
        </Link>
        <Link href="/studio/templates" className="rounded-xl border px-5 py-2.5 text-sm">Templates</Link>
        <Link href="/studio/qa" className="rounded-xl border px-5 py-2.5 text-sm">AI QA</Link>
      </div>

      <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
        <h2 className="font-semibold">My Games ({games.length})</h2>
        {games.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            아직 게임이 없습니다. <Link href="/studio/upload" className="text-primary hover:underline">첫 게임 만들기 →</Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {games.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                <span className="font-medium">{g.title}</span>
                <span className="text-muted-foreground">{g.status} · {g.plays} plays</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DashStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
