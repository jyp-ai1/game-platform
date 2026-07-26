/** Replay Plugin System — compose games from plugins. */

export type PluginId =
  | "leaderboard" | "passport" | "journey" | "achievement" | "collection"
  | "multiplayer" | "ads" | "analytics" | "notification" | "voice" | "tournament";

export interface ReplayPlugin {
  id: PluginId;
  label: string;
  engine: string;
  description: string;
  enabled: boolean;
}

export const BUILTIN_PLUGINS: ReplayPlugin[] = [
  { id: "leaderboard", label: "Leaderboard", engine: "engine.analytics", description: "Ranking · Top10 · Friend rank", enabled: true },
  { id: "passport", label: "Passport", engine: "engine.identity", description: "Player identity · Level · Badges", enabled: true },
  { id: "journey", label: "Journey", engine: "player.journey", description: "Timeline · Story · Wrapped", enabled: true },
  { id: "achievement", label: "Achievement", engine: "engine.achievement", description: "Unlock · Badge · Collection", enabled: true },
  { id: "collection", label: "Collection", engine: "engine.collection", description: "Genre collection · % complete", enabled: true },
  { id: "multiplayer", label: "Multiplayer", engine: "engine.multiplayer", description: "Room · Party · Spectator", enabled: true },
  { id: "ads", label: "Ads", engine: "revenue.ads", description: "Rewarded · Banner placement", enabled: false },
  { id: "analytics", label: "Analytics", engine: "engine.analytics", description: "Events · Funnel · Retention", enabled: true },
  { id: "notification", label: "Notification", engine: "engine.notification", description: "Push · In-app alerts", enabled: false },
  { id: "voice", label: "Voice", engine: "engine.multiplayer", description: "Voice chat in rooms", enabled: false },
  { id: "tournament", label: "Tournament", engine: "growth.event", description: "Season · Bracket · Prize", enabled: false },
];

const activePlugins = new Set<PluginId>(BUILTIN_PLUGINS.filter((p) => p.enabled).map((p) => p.id));

export function usePlugin(id: PluginId): ReplayPlugin | null {
  return BUILTIN_PLUGINS.find((p) => p.id === id) ?? null;
}

export function enablePlugin(id: PluginId): void {
  activePlugins.add(id);
}

export function disablePlugin(id: PluginId): void {
  activePlugins.delete(id);
}

export function isPluginEnabled(id: PluginId): boolean {
  return activePlugins.has(id);
}

export function listPlugins(): ReplayPlugin[] {
  return BUILTIN_PLUGINS.map((p) => ({ ...p, enabled: activePlugins.has(p.id) }));
}

/** Configure game with required plugins only. */
export function configureGamePlugins(ids: PluginId[]): PluginId[] {
  activePlugins.clear();
  for (const id of ids) activePlugins.add(id);
  return [...activePlugins];
}

export const DEFAULT_GAME_PLUGINS: PluginId[] = [
  "leaderboard", "passport", "achievement", "collection", "analytics",
];

export const MULTIPLAYER_GAME_PLUGINS: PluginId[] = [
  ...DEFAULT_GAME_PLUGINS, "multiplayer", "journey",
];
