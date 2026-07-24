import { fetchSystemHealth } from "@/lib/supabase/admin-server";

export const metadata = { title: "System" };

export default async function AdminSystemPage() {
  const health = await fetchSystemHealth();

  const items = health
    ? Object.entries(health).map(([key, value]) => [key, value] as const)
    : ([
        ["supabase", "0017 migration pending"],
        ["vercel", "GitHub auto-deploy"],
        ["cms", "/admin/cms/audit"],
        ["seo", "/admin/seo"],
      ] as const);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System</h1>
        <p className="text-sm text-muted-foreground">
          Health · Monitoring · Feature flags (Sprint 12)
        </p>
      </div>
      {!health ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          `0017_audit_log_enhanced.sql` 적용 후 health RPC가 활성화됩니다.
        </p>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2">
        {items.map(([name, status]) => (
          <div key={name} className="rounded-xl border bg-card p-4">
            <p className="font-medium capitalize">{name.replace(/_/g, " ")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{status}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
