"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/cms", label: "개요", exact: true },
  { href: "/admin/cms/banners", label: "배너" },
  { href: "/admin/cms/notices", label: "공지" },
  { href: "/admin/cms/events", label: "이벤트" },
  { href: "/admin/cms/featured", label: "추천" },
  { href: "/admin/cms/categories", label: "카테고리" },
  { href: "/admin/cms/visibility", label: "노출관리" },
  { href: "/admin/cms/audit", label: "Audit Log" },
];

export function CmsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-border pb-4">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
