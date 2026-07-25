import type { LucideIcon } from "lucide-react";
import { Compass, Home, Map, User, Users } from "lucide-react";

export interface MainNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match pathname prefix for active state (e.g. /games for discover) */
  match?: (pathname: string) => boolean;
}

export const mainNavItems: MainNavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    label: "Discover",
    href: "/games",
    icon: Compass,
    match: (p) => p === "/games" || p.startsWith("/categories/") || p.startsWith("/search"),
  },
  {
    label: "Journey",
    href: "/journey",
    icon: Map,
    match: (p) => p.startsWith("/journey") || p === "/favorites",
  },
  {
    label: "Community",
    href: "/community",
    icon: Users,
    match: (p) => p.startsWith("/community"),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    match: (p) => p.startsWith("/profile"),
  },
];
