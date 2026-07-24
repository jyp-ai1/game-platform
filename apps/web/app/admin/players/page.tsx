import Link from "next/link";

import { searchPlayersCrm } from "@/lib/supabase/ops-server";

export const metadata = { title: "Players" };

function maskDeviceId(deviceId: string): string {
  if (deviceId.length <= 12) return deviceId;
  return `${deviceId.slice(0, 6)}…${deviceId.slice(-4)}`;
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q = "", status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  const statusFilter =
    status === "active" || status === "suspended" ? status : null;

  const result = await searchPlayersCrm(q, statusFilter, limit, offset);
  const totalPages = result ? Math.ceil(result.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Player CRM</h1>
        <p className="text-sm text-muted-foreground">
          device_id 기반 플레이어 검색 · 상세 · 정지 · 메모
        </p>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="device_id 또는 닉네임 검색"
          className="min-w-[240px] flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          검색
        </button>
      </form>

      {!result ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          `0011_platform_tables.sql` 및 `0018_sprint12.sql` 마이그레이션을 확인하세요.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            총 {result.total.toLocaleString()}명
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Nickname</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Plays</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((player) => (
                  <tr key={player.device_id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-mono text-xs">
                      {maskDeviceId(player.device_id)}
                    </td>
                    <td className="px-4 py-3">{player.nickname ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          player.status === "suspended"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {player.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{player.total_plays}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(player.last_seen).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/players/${encodeURIComponent(player.device_id)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`/admin/players?q=${encodeURIComponent(q)}&status=${status ?? ""}&page=${page - 1}`}
                  className="rounded-lg border px-3 py-1.5 text-sm"
                >
                  이전
                </Link>
              ) : null}
              <span className="px-2 py-1.5 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/admin/players?q=${encodeURIComponent(q)}&status=${status ?? ""}&page=${page + 1}`}
                  className="rounded-lg border px-3 py-1.5 text-sm"
                >
                  다음
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
