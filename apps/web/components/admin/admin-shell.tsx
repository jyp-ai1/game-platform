"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminNav } from "./admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 border-r bg-card p-4 md:block">
        <Link href="/" className="mb-6 block text-sm font-semibold text-primary">
          ← Re:Play
        </Link>
        <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
          Operations
        </p>
        <AdminNav pathname={pathname} />
      </aside>
      <div className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</div>
    </div>
  );
}
