import Link from "next/link";

import { AdminOpsLiveDashboard } from "@/components/admin-ops-live-dashboard";
import { ProductOsDashboard } from "@/components/product-os-dashboard";
import { OperationsGatePanel } from "@/components/operations-gate-panel";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export const metadata = { title: "AI Operation Center — Project Phoenix" };

export default function AiOperationCenterPage() {
  const data = getReleaseDashboardData();

  const pipeline = [
    "Comment ingest",
    "Bug extraction",
    "Classification",
    "GitHub draft issue",
    "Priority scoring",
    "QA trigger",
    "Release note draft",
    "Deploy queue",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI Operation Center</h1>
        <p className="text-sm text-muted-foreground">Track H — automated ops pipeline</p>
        <Link href="/admin/pm" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          AI PM Experience 2.0 — Co-Founder Hub →
        </Link>
      </div>

      <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <h2 className="font-semibold">Replay OS 2.0</h2>
        <p className="mt-1 text-sm text-muted-foreground">8 Platforms · 6 Operating Systems</p>
        <Link href="/admin/os" className="mt-3 inline-block text-sm text-violet-400 hover:underline">
          Open OS Dashboard →
        </Link>
      </section>

      <section className="replay-panel rounded-2xl p-6">
        <h2 className="font-semibold">Pipeline</h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {pipeline.map((step, i) => (
            <li key={step} className="flex items-center gap-2 text-sm">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">
                {i + 1}
              </span>
              {step}
              {i < pipeline.length - 1 ? <span className="text-muted-foreground">→</span> : null}
            </li>
          ))}
        </ol>
      </section>

      <ProductOsDashboard />
      <OperationsGatePanel />
      <AdminOpsLiveDashboard />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="replay-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Draft Issues</p>
          <p className="text-2xl font-bold">4</p>
        </div>
        <div className="replay-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">RC Score</p>
          <p className="text-2xl font-bold">{data.rc1Score}%</p>
        </div>
        <div className="replay-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Deploy Queue</p>
          <p className="text-2xl font-bold">Ready</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/health" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          Health Center
        </Link>
        <Link href="/admin/developer" className="rounded-lg border px-4 py-2 text-sm">
          Developer Platform
        </Link>
      </div>
    </div>
  );
}
