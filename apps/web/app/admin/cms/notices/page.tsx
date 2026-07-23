import { NoticeManager } from "@/components/admin/notice-manager";
import { listNotices } from "@/app/admin/cms/actions";

export const metadata = { title: "CMS · 공지" };

export default async function CmsNoticesPage() {
  let notices: Awaited<ReturnType<typeof listNotices>> = [];
  try {
    notices = await listNotices();
  } catch {
    /* empty */
  }
  return <NoticeManager notices={notices as Parameters<typeof NoticeManager>[0]["notices"]} />;
}
