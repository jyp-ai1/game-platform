"use client";

import { cn } from "@game-platform/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bug,
  DollarSign,
  Gamepad2,
  LayoutDashboard,
  MessageSquare,
  Rocket,
  Upload,
} from "lucide-react";

const STUDIO_NAV = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/games", label: "My Games", icon: Gamepad2 },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/comments", label: "Comments", icon: MessageSquare },
  { href: "/studio/qa", label: "QA", icon: Bug },
  { href: "/studio/upload", label: "Publish", icon: Upload },
  { href: "/studio/revenue", label: "Revenue", icon: DollarSign },
  { href: "/studio/templates", label: "Templates", icon: Rocket },
];

export function CreatorStudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-52 shrink-0 border-r bg-card/50 p-4 md:block">
        <Link href="/creators" className="mb-4 block text-sm font-semibold text-violet-400">
          ← Creators
        </Link>
        <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Creator Studio</p>
        <nav className="space-y-1">
          {STUDIO_NAV.map((item) => {
            const active = item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-violet-500/15 text-violet-300" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</div>
    </div>
  );
}
