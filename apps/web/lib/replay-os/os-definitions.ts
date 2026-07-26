/** Replay OS 2.0 — 8 Platforms + 6 Operating Systems definitions. */

export type PlatformId =
  | "player" | "creator" | "operations" | "ai"
  | "game-sdk" | "marketplace" | "growth" | "developer";

export interface PlatformDef {
  id: PlatformId;
  label: string;
  description: string;
  href: string;
}

export const REPLAY_PLATFORMS: PlatformDef[] = [
  { id: "player", label: "Player Platform", description: "Passport · Journey · Challenge · Friend", href: "/passport" },
  { id: "creator", label: "Creator Platform", description: "Studio · Builder · Marketplace · Revenue", href: "/creators" },
  { id: "operations", label: "Operations Platform", description: "Health · Deploy · RC · Metrics", href: "/admin/os" },
  { id: "ai", label: "AI Platform", description: "QA · Bug · Fix PR · Operation", href: "/admin/operations" },
  { id: "game-sdk", label: "Game Platform SDK", description: "Replay Engine · Plugins · Runtime", href: "/studio/build" },
  { id: "marketplace", label: "Marketplace", description: "Games · Assets · Logic · Templates", href: "/marketplace" },
  { id: "growth", label: "Growth Platform", description: "Mission · Streak · Season · Referral", href: "/missions" },
  { id: "developer", label: "Developer Platform", description: "CLI · Docs · CI/CD · Samples", href: "/admin/developer" },
];

export type OSId = "player" | "creator" | "growth" | "ai" | "operation" | "revenue";

export interface OSDef {
  id: OSId;
  label: string;
  mission: string;
  modules: string[];
  href: string;
  completion: number;
}

export const REPLAY_OS: OSDef[] = [
  {
    id: "player",
    label: "Player OS",
    mission: "왜 계속 돌아오는가",
    modules: ["Passport", "Journey", "Challenge", "Friend", "Collection", "Replay"],
    href: "/passport",
    completion: 88,
  },
  {
    id: "creator",
    label: "Creator OS",
    mission: "왜 게임이 계속 올라오는가",
    modules: ["Studio", "AI Builder", "Remix", "Template", "Marketplace", "Analytics", "Revenue"],
    href: "/studio",
    completion: 72,
  },
  {
    id: "growth",
    label: "Growth OS",
    mission: "DAU",
    modules: ["Mission", "Notification", "Streak", "Season", "Referral", "Event"],
    href: "/missions",
    completion: 82,
  },
  {
    id: "ai",
    label: "AI OS",
    mission: "운영비 절감",
    modules: ["QA", "Bug", "Fix PR", "Summary", "Recommendation", "Operation"],
    href: "/admin/operations",
    completion: 75,
  },
  {
    id: "operation",
    label: "Operation OS",
    mission: "운영자 5분",
    modules: ["Health", "Deploy", "RC", "Metrics", "Release", "Reports"],
    href: "/admin/os",
    completion: 92,
  },
  {
    id: "revenue",
    label: "Revenue OS",
    mission: "돈을 버는 시스템",
    modules: ["Premium", "Ads", "Sponsor", "Creator Revenue", "Asset Store", "Subscription"],
    href: "/studio/revenue",
    completion: 45,
  },
];

export function getOverallOSCompletion(): number {
  return Math.round(REPLAY_OS.reduce((s, o) => s + o.completion, 0) / REPLAY_OS.length);
}
