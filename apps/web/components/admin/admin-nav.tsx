import Link from "next/link";

const NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/monitoring", label: "Monitoring" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/errors", label: "Errors" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/cms", label: "CMS" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/assistant", label: "Assistant" },
  { href: "/admin/system", label: "System" },
];

export function AdminNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
