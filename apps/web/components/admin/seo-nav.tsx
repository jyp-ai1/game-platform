"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/seo", label: "Dashboard", exact: true },
  { href: "/admin/seo/verification", label: "Verification" },
  { href: "/admin/seo/inspect", label: "URL 검사" },
];

export function SeoNav() {
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
