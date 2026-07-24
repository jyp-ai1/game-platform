import Link from "next/link";

import { RealtimeMonitoringPanel } from "@/components/admin/realtime-monitoring-panel";
import { fetchSystemHealth } from "@/lib/supabase/admin-server";
import { fetchOpsRealtimeStats } from "@/lib/supabase/ops-server";

export const metadata = { title: "Monitoring" };

export default async function AdminMonitoringPage() {
  const [stats, health] = await Promise.all([
    fetchOpsRealtimeStats(),
    fetchSystemHealth(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Real-time Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            접속 · 플레이 · 에러 · 시스템 헬스
          </p>
        </div>
        <Link
          href="/admin/errors"
          className="text-sm font-medium text-primary hover:underline"
        >
          Error Center →
        </Link>
      </div>

      <RealtimeMonitoringPanel initial={stats} />

      <section>
        <h2 className="mb-4 text-lg font-semibold">System Health</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {health
            ? Object.entries(health).map(([name, status]) => (
                <div key={name} className="rounded-xl border bg-card p-4">
                  <p className="font-medium capitalize">{name.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{status}</p>
                </div>
              ))
            : (
              <p className="text-sm text-muted-foreground">Health RPC unavailable</p>
            )}
        </div>
      </section>
    </div>
  );
}
