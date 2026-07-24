import Link from "next/link";

import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export const metadata = { title: "Release Dashboard — RC1" };

function GateCard({
  label,
  status,
  detail,
}: {
  label: string;
  status: string;
  detail?: string;
}) {
  const tone =
    status === "PASS"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : status === "FAIL"
        ? "border-red-500/40 bg-red-500/10 text-red-400"
        : "border-amber-500/40 bg-amber-500/10 text-amber-400";

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{status}</p>
      {detail ? <p className="mt-1 text-xs opacity-80">{detail}</p> : null}
    </div>
  );
}

export default function ReleaseDashboardPage() {
  const data = getReleaseDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Release Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            RC1 quality gates · {data.playable} games · {data.branch}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-right">
          <p className="text-xs text-muted-foreground">RC1 Score</p>
          <p className="text-3xl font-bold tabular-nums text-primary">{data.rc1Score}%</p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.gates).map(([key, gate]) => (
          <GateCard
            key={key}
            label={key.replace(/([A-Z])/g, " $1").trim()}
            status={gate.status}
            detail={
              gate.detail ??
              (gate.count != null ? `count: ${gate.count}` : undefined) ??
              (gate.avg != null ? `avg: ${gate.avg}` : undefined)
            }
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Predicted Top 10</h2>
          <ol className="space-y-2 text-sm">
            {data.predictedTop10.map((g, i) => (
              <li key={g.slug} className="flex justify-between gap-2">
                <span>
                  #{i + 1}{" "}
                  <Link href={`/games/${g.slug}`} className="hover:underline">
                    {g.title}
                  </Link>
                </span>
                <span className="tabular-nums text-muted-foreground">{g.predictedScore}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Predicted Bottom 10</h2>
          <ol className="space-y-2 text-sm">
            {data.predictedBottom10.map((g, i) => (
              <li key={g.slug} className="flex justify-between gap-2">
                <span>
                  #{i + 1}{" "}
                  <Link href={`/games/${g.slug}`} className="hover:underline">
                    {g.title}
                  </Link>
                </span>
                <span className="tabular-nums text-muted-foreground">{g.predictedScore}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">50 Games Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 pr-3">Game</th>
                <th className="pb-2 pr-3">Meta</th>
                <th className="pb-2 pr-3">Thumb</th>
                <th className="pb-2 pr-3">Review</th>
                <th className="pb-2 pr-3">Load</th>
              </tr>
            </thead>
            <tbody>
              {data.games.map((g) => (
                <tr key={g.slug} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3 font-medium">{g.slug}</td>
                  <td className="py-2 pr-3">{g.metadata ?? "—"}</td>
                  <td className="py-2 pr-3">{g.thumbnail ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {g.reviewScore != null ? `${g.reviewScore} (${g.grade})` : "—"}
                  </td>
                  <td className="py-2 tabular-nums">
                    {g.loadMs != null ? `${g.loadMs}ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Generated {new Date(data.generatedAt).toLocaleString()} · Run{" "}
        <code className="rounded bg-muted px-1">npm run qa:quality</code> to refresh
      </p>
    </div>
  );
}
