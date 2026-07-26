/** Replay Layer Stack L1–L7 — no fake percentages, DoD only. */

export type LayerId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export type LayerStatus = "done" | "in_progress" | "blocked" | "not_started";

export interface LayerDef {
  id: LayerId;
  name: string;
  scope: string[];
  status: LayerStatus;
  href?: string;
  /** Lower layer must be done before working on this layer. */
  dependsOn: LayerId | null;
}

export const REPLAY_LAYERS: LayerDef[] = [
  {
    id: "L1",
    name: "Infrastructure",
    scope: ["Auth", "Supabase", "Storage", "CI", "Deploy", "QA"],
    status: "in_progress",
    href: "/admin/health",
    dependsOn: null,
  },
  {
    id: "L2",
    name: "Engine",
    scope: ["Replay Engine", "Plugins", "Bus", "Cloud"],
    status: "in_progress",
    href: "/admin/os",
    dependsOn: "L1",
  },
  {
    id: "L3",
    name: "Gameplay",
    scope: ["Runtime", "Stage", "Reward", "Ranking"],
    status: "in_progress",
    href: "/games",
    dependsOn: "L2",
  },
  {
    id: "L4",
    name: "Identity",
    scope: ["Passport", "Journey", "Wrapped", "Mission"],
    status: "in_progress",
    href: "/passport",
    dependsOn: "L3",
  },
  {
    id: "L5",
    name: "Community",
    scope: ["Friends", "Challenge", "League", "Guild"],
    status: "in_progress",
    href: "/community",
    dependsOn: "L4",
  },
  {
    id: "L6",
    name: "Creator",
    scope: ["Studio", "Marketplace", "Templates"],
    status: "in_progress",
    href: "/creators",
    dependsOn: "L5",
  },
  {
    id: "L7",
    name: "Business",
    scope: ["Revenue", "Premium", "Sponsor", "Ads"],
    status: "not_started",
    href: "/studio/revenue",
    dependsOn: "L6",
  },
];

/** Engine DoD — measurable checklist only. */
export interface EngineDoDItem {
  id: string;
  label: string;
  done: boolean;
  layer: "L2";
  rfc?: string;
}

export const ENGINE_DOD: EngineDoDItem[] = [
  { id: "runtime", label: "Runtime", done: true, layer: "L2", rfc: "RFC-0001" },
  { id: "stage", label: "Stage", done: true, layer: "L2", rfc: "RFC-0001" },
  { id: "save", label: "Save", done: true, layer: "L2", rfc: "RFC-0001" },
  { id: "reward", label: "Reward", done: true, layer: "L2", rfc: "RFC-0001" },
  { id: "multiplayer", label: "Multiplayer (cross-device)", done: false, layer: "L2", rfc: "RFC-0001" },
  { id: "notification", label: "Notification", done: false, layer: "L2", rfc: "RFC-0001" },
  { id: "analytics", label: "Analytics", done: true, layer: "L2", rfc: "RFC-0001" },
  { id: "ai", label: "AI (production)", done: false, layer: "L2", rfc: "RFC-0001" },
  { id: "plugin", label: "Plugin", done: true, layer: "L2", rfc: "RFC-0002" },
  { id: "cli", label: "CLI", done: true, layer: "L2", rfc: "RFC-0002" },
];

export function getEngineDoDProgress(): { done: number; total: number } {
  const done = ENGINE_DOD.filter((i) => i.done).length;
  return { done, total: ENGINE_DOD.length };
}

export function getActiveLayer(): LayerDef {
  const order: LayerId[] = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];
  for (const id of order) {
    const layer = REPLAY_LAYERS.find((l) => l.id === id)!;
    if (layer.status !== "done") return layer;
  }
  return REPLAY_LAYERS[REPLAY_LAYERS.length - 1]!;
}
