import { fetchCmsOverview, listAuditLog } from "@/app/admin/cms/actions";

export const metadata = { title: "CMS" };

export default async function CmsOverviewPage() {
  let overview = null;
  let audit: Awaited<ReturnType<typeof listAuditLog>> = [];
  try {
    [overview, audit] = await Promise.all([fetchCmsOverview(), listAuditLog(10)]);
  } catch {
    // 0014 migration not applied
  }

  return (
    <div className="space-y-6">
      {!overview ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          `0014_cms_tables.sql` 마이그레이션을 Supabase SQL Editor에서 실행하세요.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["활성 배너", overview.banners_active],
            ["활성 공지", overview.notices_active],
            ["진행 이벤트", overview.events_active],
            ["추천 슬롯", overview.featured_active],
            ["7일 내 만료", overview.expiring_soon],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{value as number}</p>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-4 font-semibold">최근 Audit Log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">기록 없음</p>
        ) : (
          <ul className="divide-y text-sm">
            {audit.map((row) => (
              <li key={row.id} className="flex justify-between gap-4 py-2">
                <span>
                  <span className="font-medium">{row.action}</span>
                  {" · "}
                  {row.entity_type}
                  {row.entity_id ? ` · ${row.entity_id}` : ""}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {new Date(row.created_at).toLocaleString("ko-KR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
