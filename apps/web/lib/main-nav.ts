import { Palette, Home, Map, Compass, User, Users } from "lucide-react";

export interface MainNavItem {
  label: string;
  href: string;
  icon: typeof Home;
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
    match: (p) => p.startsWith("/journey") || p.startsWith("/library") || p === "/favorites",
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
    match: (p) => p.startsWith("/profile") || p.startsWith("/passport") || p.startsWith("/wrapped"),
  },
];
