export const metadata = { title: "System" };

export default function AdminSystemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System</h1>
        <p className="text-sm text-muted-foreground">
          Feature Flag · Error Dashboard · Search Console verification — T7
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        {[
          ["Supabase", "연결됨 (analytics_events, CMS tables)"],
          ["Vercel", "GitHub auto-deploy"],
          ["Analytics Queue", "track_analytics_event RPC"],
          ["CMS Audit", "/admin/cms/audit"],
        ].map(([name, status]) => (
          <div key={name} className="rounded-xl border bg-card p-4">
            <p className="font-medium">{name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{status}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
