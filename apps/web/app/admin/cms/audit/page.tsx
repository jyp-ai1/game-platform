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
            <th className="p-3">ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/50">
              <td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString("ko-KR")}</td>
              <td className="p-3">{row.action}</td>
              <td className="p-3">{row.entity_type}</td>
              <td className="p-3 text-muted-foreground">{row.entity_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
