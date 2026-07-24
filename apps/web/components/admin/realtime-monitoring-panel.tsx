"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { OpsRealtimeStats } from "@/lib/supabase/ops-server";

function StatCard({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${alert ? "border-destructive/40" : ""}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${alert ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function RealtimeMonitoringPanel({
  initial,
}: {
  initial: OpsRealtimeStats | null;
}) {
  const router = useRouter();
  const [stats, setStats] = useState(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      startTransition(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  if (!stats) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        `0018_sprint12.sql` 마이그레이션 적용 후 실시간 모니터링이 활성화됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>30초마다 자동 갱신</span>
        <span>마지막 확인: {new Date(stats.checked_at).toLocaleTimeString("ko-KR")}</span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="현재 접속" value={stats.online_users} />
        <StatCard label="플레이 중" value={stats.playing_now} />
        <StatCard label="오늘 플레이" value={stats.today_plays} />
        <StatCard label="오늘 점수" value={stats.today_scores} />
        <StatCard label="에러 (1h)" value={stats.errors_1h} alert={stats.errors_1h > 0} />
        <StatCard label="에러 (오늘)" value={stats.errors_today} alert={stats.errors_today > 0} />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">활성 게임 (5분)</h2>
          {stats.active_games.length ? (
            <ul className="space-y-2 text-sm">
              {stats.active_games.map((g) => (
                <li key={g.game_slug} className="flex justify-between">
                  <span>{g.game_slug}</span>
                  <span className="tabular-nums text-muted-foreground">{g.plays}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">활성 게임 없음</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">최근 에러</h2>
          {stats.recent_errors.length ? (
            <ul className="divide-y text-sm">
              {stats.recent_errors.map((e, i) => (
                <li key={i} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{e.event_type}</span>
                    <span className="shrink-0 text-muted-foreground">{e.seconds_ago}s ago</span>
                  </div>
                  <p className="mt-1 truncate text-muted-foreground">
                    {String((e.metadata as { message?: string }).message ?? e.game_slug ?? "—")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">최근 에러 없음</p>
          )}
        </div>
      </section>
    </div>
  );
}
