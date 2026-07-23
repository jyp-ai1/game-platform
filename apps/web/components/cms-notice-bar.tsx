import type { CmsNotice } from "@/lib/supabase/cms";

const TYPE_LABEL: Record<string, string> = {
  urgent: "긴급",
  maintenance: "점검",
  update: "업데이트",
  event: "이벤트",
  normal: "공지",
};

export function CmsNoticeBar({ notices }: { notices: CmsNotice[] }) {
  if (notices.length === 0) return null;

  return (
    <section className="border-b bg-primary/5 py-2">
      <div className="mx-auto max-w-6xl space-y-1 px-4">
        {notices.map((n) => (
          <div key={n.id} className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
              {TYPE_LABEL[n.notice_type] ?? n.notice_type}
            </span>
            <span className="font-medium">{n.title}</span>
            {n.body ? <span className="text-muted-foreground">{n.body}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
