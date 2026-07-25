import Link from "next/link";

import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export const metadata = { title: "Health — Operator Center" };

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
    <div className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colors[tone]}`}>{value}</p>
    </div>
  );
}

export default function AdminHealthPage() {
  const data = getReleaseDashboardData();
  const rcOk = data.rc1Score >= 95;
  const gateEntries = Object.entries(data.gates);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Operator Health</h1>
        <p className="text-sm text-muted-foreground">
          {data.branch} · {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Games" value={`${data.playable}/50`} tone="ok" />
        <Stat label="RC Score" value={`${data.rc1Score}%`} tone={rcOk ? "ok" : "warn"} />
        <Stat
          label="Regression"
          value={data.gates.regression?.status ?? "—"}
          tone={data.gates.regression?.status === "PASS" ? "ok" : "warn"}
        />
        <Stat
          label="Release Ready"
          value={rcOk && data.gates.regression?.status === "PASS" ? "YES" : "NO"}
          tone={rcOk ? "ok" : "warn"}
        />
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
        <Stat label="QA Automation" value={data.gates.qaAutomation?.status ?? "—"} />
        <Stat label="Metadata" value={data.gates.metadata?.status ?? "—"} />
        <Stat label="Thumbnails" value={data.gates.thumbnails?.status ?? "—"} />
        <Stat label="Bundle" value={data.gates.bundle?.status ?? "—"} />
        <Stat label="Broken 404" value={String(data.gates.brokenLinks?.count ?? 0)} />
      </div>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h2 className="font-semibold">AI Summary</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>Snake — 3 reports (stage UX)</li>
          <li>Memory — 2 reports (mobile touch)</li>
          <li>Ranking refresh — resolved Epic3</li>
        </ul>
      </section>

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
