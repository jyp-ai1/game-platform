import Link from "next/link";

import { fetchOpsErrorSummary } from "@/lib/supabase/ops-server";

export const metadata = { title: "Error Center" };

function maskDeviceId(deviceId: string | null): string {
  if (!deviceId) return "—";
  if (deviceId.length <= 8) return "****";
  return `${deviceId.slice(0, 4)}…${deviceId.slice(-4)}`;
}

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const { hours: hoursParam } = await searchParams;
  const hours = Number(hoursParam) === 168 ? 168 : Number(hoursParam) === 1 ? 1 : 24;
  const summary = await fetchOpsErrorSummary(hours);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Error Center</h1>
        <p className="text-sm text-muted-foreground">
          JS · API · 404 · 기타 운영 에러 집계
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        {[1, 24, 168].map((h) => (
          <Link
            key={h}
            href={`/admin/errors?hours=${h}`}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              hours === h
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {h === 1 ? "1h" : h === 24 ? "24h" : "7d"}
          </Link>
        ))}
      </div>

      {!summary ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          `0018_sprint12.sql` 마이그레이션 적용 후 Error Center가 활성화됩니다.
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.total}</p>
            </div>
            {Object.entries(summary.by_type).map(([type, cnt]) => (
              <div key={type} className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">{type}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{cnt}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-4 font-semibold">게임별</h2>
              <ul className="space-y-2 text-sm">
                {summary.by_game.map((g) => (
                  <li key={g.game_slug} className="flex justify-between">
                    <span>{g.game_slug}</span>
                    <span className="tabular-nums text-muted-foreground">{g.cnt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-4 font-semibold">최근 에러</h2>
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2">Type</th>
                      <th className="py-2 pr-2">Game</th>
                      <th className="py-2 pr-2">Device</th>
                      <th className="py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent.map((row) => (
                      <tr key={row.id} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-2 font-medium">{row.event_type}</td>
                        <td className="py-2 pr-2">{row.game_slug ?? "—"}</td>
                        <td className="py-2 pr-2">{maskDeviceId(row.device_id)}</td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(row.created_at).toLocaleString("ko-KR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
