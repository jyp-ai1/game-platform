import { CmsNav } from "@/components/admin/cms-nav";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold">CMS</h1>
        <p className="text-sm text-muted-foreground">
          배너 · 공지 · 이벤트 · 추천 · 노출 — 코드 수정 없이 운영
        </p>
      </div>
      <CmsNav />
      {children}
    </div>
  );
}
