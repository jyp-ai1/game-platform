import { Badge, Button, Container } from "@game-platform/ui";
import { Search } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/lib/site-config";
import { mainNavItems } from "@/lib/main-nav";

import { HeaderLevelBadge } from "./header-level-badge";
import { MobileNav } from "./mobile-nav";
import { SoundToggle } from "./sound-toggle";
import { AuthHeaderControls } from "./auth-header-controls";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <Container className="relative flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {siteConfig.name}
          <span className="ml-1.5 hidden text-xs font-normal text-primary sm:inline">
            2.0
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {mainNavItems.map((item) =>
            item.href === "/creator" ? (
              <Link
                key={item.href}
                href={item.href}
                data-testid="nav-ai-creator-soon"
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/25"
              >
                AI Creator
                <Badge className="border-violet-300/50 bg-violet-400/20 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-violet-100">
                  SOON
                </Badge>
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-1">
          <HeaderLevelBadge />
          <SoundToggle />
          <AuthHeaderControls />
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
          <MobileNav navItems={mainNavItems.map(({ label, href }) => ({ label, href }))} />
        </div>
      </Container>
    </header>
  );
}
