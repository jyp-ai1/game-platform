import { listAuditLog } from "@/app/admin/cms/actions";

export const metadata = { title: "CMS · Audit Log" };

export default async function CmsAuditPage() {
  let rows: Awaited<ReturnType<typeof listAuditLog>> = [];
  try {
    rows = await listAuditLog(50);
  } catch {
    /* empty */
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-3">시간</th>
            <th className="p-3">Action</th>
            <th className="p-3">Entity</th>
            <th className="p-3">IP</th>
            <th className="p-3">Device</th>
            <th className="p-3">변경</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/50 align-top">
              <td className="p-3 whitespace-nowrap">
                {new Date(row.created_at).toLocaleString("ko-KR")}
              </td>
              <td className="p-3">{row.action}</td>
              <td className="p-3">
                {row.entity_type}
                {row.entity_id ? ` · ${row.entity_id}` : ""}
              </td>
              <td className="p-3 text-muted-foreground">{row.actor_ip ?? "—"}</td>
              <td className="p-3 max-w-[120px] truncate text-xs text-muted-foreground" title={row.user_agent ?? ""}>
                {row.user_agent ? row.user_agent.slice(0, 40) : "—"}
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {row.before_state || row.after_state ? (
                  <details>
                    <summary className="cursor-pointer">before / after</summary>
                    <pre className="mt-1 max-w-md overflow-auto whitespace-pre-wrap">
                      {JSON.stringify({ before: row.before_state, after: row.after_state }, null, 2)}
                    </pre>
                  </details>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
