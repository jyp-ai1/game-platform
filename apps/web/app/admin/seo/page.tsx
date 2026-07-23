import { fetchSeoAuditStats } from "@/lib/supabase/admin-server";
import { siteUrl } from "@/lib/site";

export const metadata = { title: "SEO Dashboard" };

export default async function AdminSeoDashboardPage() {
  const audit = await fetchSeoAuditStats();

  return (
    <div className="space-y-6">
      {!audit ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          `0015_seo_platform.sql` 마이그레이션을 Supabase SQL Editor에서 실행하세요.
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Sitemap Pages", audit.sitemap_pages],
              ["Indexable Games", audit.indexable_games],
              ["Meta Missing", audit.meta_missing],
              ["OG Missing", audit.og_missing],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{value as number}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Hidden Games</p>
              <p className="mt-1 text-xl font-bold">{audit.hidden_games}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Maintenance</p>
              <p className="mt-1 text-xl font-bold">{audit.maintenance_games}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="mt-1 text-xl font-bold">{audit.indexable_categories}</p>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Search Console Verification</h2>
            <ul className="space-y-1 text-sm">
              {(["google_verification", "bing_verification", "naver_verification"] as const).map(
                (key) => {
                  const label = key.replace("_verification", "");
                  const val = audit.verification?.[key];
                  return (
                    <li key={key} className="flex justify-between gap-4">
                      <span className="capitalize">{label}</span>
                      <span className={val?.trim() ? "text-green-400" : "text-muted-foreground"}>
                        {val?.trim() ? "등록됨" : "미등록"}
                      </span>
                    </li>
                  );
                }
              )}
            </ul>
          </section>

          {audit.last_lighthouse ? (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-semibold">Latest Lighthouse</h2>
              <p className="mb-2 text-sm text-muted-foreground">{audit.last_lighthouse.url}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["Performance", audit.last_lighthouse.performance],
                    ["Accessibility", audit.last_lighthouse.accessibility],
                    ["Best Practices", audit.last_lighthouse.best_practices],
                    ["SEO", audit.last_lighthouse.seo],
                  ] as const
                ).map(([label, score]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold tabular-nums">{score}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>Sitemap: {siteUrl}/sitemap.xml</p>
        <p>Robots: {siteUrl}/robots.txt</p>
      </section>
    </div>
  );
}
