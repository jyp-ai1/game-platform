import { VisibilityManager } from "@/components/admin/visibility-manager";
import { listGameVisibility } from "@/app/admin/cms/actions";

export const metadata = { title: "CMS · 노출관리" };

export default async function CmsVisibilityPage() {
  let rows: Awaited<ReturnType<typeof listGameVisibility>> = [];
  try {
    rows = await listGameVisibility();
  } catch {
    /* empty */
  }
  return <VisibilityManager rows={rows as Parameters<typeof VisibilityManager>[0]["rows"]} />;
}
