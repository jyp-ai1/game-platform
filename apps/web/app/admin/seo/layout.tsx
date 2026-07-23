import { SeoNav } from "@/components/admin/seo-nav";

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold">SEO & Search Console</h1>
        <p className="text-sm text-muted-foreground">
          색인 · 메타 · JSON-LD · Verification · Lighthouse
        </p>
      </div>
      <SeoNav />
      {children}
    </div>
  );
}
