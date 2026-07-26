"use client";

import { cn } from "@game-platform/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNavItems } from "@/lib/main-nav";

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/studio")) {
    return null;
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur sm:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {mainNavItems.map((item) => {
          const active = item.match?.(pathname) ?? pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
