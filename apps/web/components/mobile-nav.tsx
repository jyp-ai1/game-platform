"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Button } from "@game-platform/ui";

interface NavItem {
  label: string;
  href?: string;
}

export function MobileNav({ navItems }: { navItems: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X /> : <Menu />}
      </Button>

      {open ? (
        <div className="absolute inset-x-0 top-full border-b bg-background px-4 pb-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.label}
                  className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-muted-foreground"
                >
                  {item.label}
                  <Badge variant="outline">Soon</Badge>
                </span>
              )
            )}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
