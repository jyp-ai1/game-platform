import Link from "next/link";

import { HealthAiSummary } from "@/components/health-ai-summary";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export const metadata = { title: "Health — Operator Center 2.0" };

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "fail";
}) {
  const colors = {
    default: "text-foreground",
    ok: "text-emerald-400",
    warn: "text-amber-400",
    fail: "text-red-400",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur transition-shadow hover:shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colors[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminHealthPage() {
  const data = getReleaseDashboardData();
  const rcOk = data.rc1Score >= 95;
  const gateEntries = Object.entries(data.gates);
  const topGame = data.predictedTop10?.[0]?.slug ?? "—";
  const worstGame = data.predictedBottom10?.[0]?.slug ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Operator Health 2.0</h1>
        <p className="text-sm text-muted-foreground">
          {data.branch} · {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Games OK" value={`${data.playable}/50`} tone="ok" />
        <Stat label="RC Score" value={`${data.rc1Score}%`} tone={rcOk ? "ok" : "warn"} />
        <Stat label="Avg Play Time" value={`${data.gates.gameReviews?.avg ?? 89} review`} />
        <Stat
          label="Release Ready"
          value={rcOk && data.gates.regression?.status === "PASS" ? "YES" : "NO"}
          tone={rcOk ? "ok" : "warn"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Top Game" value={topGame} tone="ok" />
        <Stat label="Worst Game" value={worstGame} tone="warn" />
        <Stat label="404 / Broken" value={String(data.gates.brokenLinks?.count ?? 0)} />
        <Stat label="Avg Review" value={`${data.gates.gameReviews?.avg ?? "—"}/100`} />
      </div>

      <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
        <h2 className="font-semibold">RC Gates</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {gateEntries.map(([key, gate]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{key}</span>
              <span
                className={
                  gate.status === "PASS"
                    ? "font-medium text-emerald-400"
                    : gate.status === "FAIL"
                      ? "font-medium text-red-400"
                      : "font-medium text-amber-400"
                }
              >
                {gate.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Analytics" value={data.gates.analytics?.status ?? "—"} />
        <Stat label="Bundle" value={data.gates.bundle?.status ?? "—"} />
        <Stat label="Metadata" value={data.gates.metadata?.status ?? "—"} />
        <Stat label="Thumbnails" value={data.gates.thumbnails?.status ?? "—"} />
        <Stat label="QA Automation" value={data.gates.qaAutomation?.status ?? "—"} />
        <Stat label="Regression" value={data.gates.regression?.status ?? "—"} />
      </div>

      <HealthAiSummary />

      <section className="grid gap-2 sm:grid-cols-2">
        {[
          { href: "/admin/release-dashboard", label: "Release Dashboard" },
          { href: "/admin/analytics", label: "Analytics" },
          { href: "/admin/errors", label: "Recent Errors" },
          { href: "/admin/monitoring", label: "Monitoring" },
          { href: "/admin/games", label: "Games Admin" },
          { href: "/admin/soft-launch", label: "Soft Launch KPI" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {item.label} →
          </Link>
        ))}
      </section>
    </div>
  );
}
