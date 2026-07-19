import { Badge, Button, Container } from "@game-platform/ui";
import { Search } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

import { MobileNav } from "./mobile-nav";

interface NavItem {
  label: string;
  href?: string;
}

const navItems: NavItem[] = [
  { label: "Games", href: "/games" },
  { label: "Favorites", href: "/favorites" },
  { label: "Ranking" },
  { label: "About", href: "/about" },
  { label: "Login" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <Container className="relative flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
              >
                {item.label}
                <Badge variant="outline">Soon</Badge>
              </span>
            )
          )}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="검색"
            nativeButton={false}
            render={
              <Link href="/search">
                <Search />
              </Link>
            }
          />
          <MobileNav navItems={navItems} />
        </div>
      </Container>
    </header>
  );
}
