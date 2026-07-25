import Link from "next/link";

import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export const metadata = { title: "Health — Operator Center" };

function Gate({ label, status }: { label: string; status: string }) {
  const tone =
    status === "PASS"
      ? "text-emerald-400"
      : status === "FAIL"
        ? "text-red-400"
        : "text-amber-400";
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{status}</p>
    </div>
  );
}

export default function AdminHealthPage() {
  const data = getReleaseDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Operator Health</h1>
        <p className="text-sm text-muted-foreground">
          Games · QA · Deploy · Release Ready
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Gate label="Playable" status={`${data.playable}`} />
        <Gate label="RC1 Score" status={`${data.rc1Score}%`} />
        <Gate label="Regression" status={data.gates.regression.status} />
        <Gate label="QA Automation" status={data.gates.qaAutomation.status} />
      </div>

      <section>
        <h2 className="text-lg font-semibold">Quality Gates</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.gates).map(([key, gate]) => (
            <div key={key} className="rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">{key}</span>
              <span className="ml-2 font-medium">{gate.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed p-5">
        <h2 className="font-semibold">Operator Actions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/admin/release-dashboard" className="text-primary hover:underline">
              Release Dashboard →
            </Link>
          </li>
          <li>
            <Link href="/admin/errors" className="text-primary hover:underline">
              Recent Errors →
            </Link>
          </li>
          <li>
            <Link href="/admin/analytics" className="text-primary hover:underline">
              Analytics →
            </Link>
          </li>
          <li>
            <Link href="/admin/monitoring" className="text-primary hover:underline">
              Monitoring →
            </Link>
          </li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Generated {data.generatedAt} · branch {data.branch}
      </p>
    </div>
  );
}
