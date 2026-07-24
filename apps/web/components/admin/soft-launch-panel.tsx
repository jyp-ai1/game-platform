import {
  computeSoftLaunchRates,
  SOFT_LAUNCH_DOC_LINKS,
  type SoftLaunchRates,
} from "@/lib/admin/soft-launch-metrics";

function RateCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}%</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function SoftLaunchKpiCards({
  dau,
  rates,
}: {
  dau: number;
  rates: SoftLaunchRates;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">Soft Launch KPI</h2>
        <p className="text-sm text-muted-foreground">
          Sprint 12.1 — DAU · Finish · Mission · Ranking · Favorite · Retry
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="DAU" value={dau} />
        <RateCard label="Finish Rate" value={rates.finishRate} />
        <RateCard label="Mission Rate" value={rates.missionRate} />
        <RateCard label="Ranking Rate" value={rates.rankingRate} />
        <RateCard label="Favorite Rate" value={rates.favoriteRate} />
        <RateCard label="Retry Rate (est.)" value={rates.retryRate} />
      </div>
    </section>
  );
}

export function SoftLaunchOpsLinks() {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 font-semibold">Soft Launch Docs</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Feedback · Known Issues · Summary — repo docs (운영 중 기록)
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SOFT_LAUNCH_DOC_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              {link.label} ↗
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { computeSoftLaunchRates };
