/** Service Registry — plugin and engine registration. */

export interface ReplayService {
  id: string;
  version: string;
  os: "player" | "creator" | "growth" | "ai" | "operation" | "revenue" | "core";
  status: "active" | "stub" | "disabled";
}

const services = new Map<string, ReplayService>();

export function registerService(service: ReplayService): void {
  services.set(service.id, service);
}

export function getService(id: string): ReplayService | undefined {
  return services.get(id);
}

export function listServices(os?: ReplayService["os"]): ReplayService[] {
  const all = [...services.values()];
  return os ? all.filter((s) => s.os === os) : all;
}

export function initCoreRegistry(): void {
  const core: Omit<ReplayService, "status">[] = [
    { id: "engine.runtime", version: "2.0", os: "core" },
    { id: "engine.multiplayer", version: "2.0", os: "core" },
    { id: "engine.identity", version: "2.0", os: "core" },
    { id: "engine.stage", version: "2.0", os: "core" },
    { id: "engine.cloud", version: "2.0", os: "core" },
    { id: "engine.achievement", version: "2.0", os: "core" },
    { id: "engine.collection", version: "2.0", os: "core" },
    { id: "engine.analytics", version: "2.0", os: "core" },
    { id: "engine.notification", version: "2.0", os: "core" },
    { id: "engine.ai", version: "2.0", os: "core" },
    { id: "player.passport", version: "2.0", os: "player" },
    { id: "player.journey", version: "2.0", os: "player" },
    { id: "creator.studio", version: "2.0", os: "creator" },
    { id: "creator.builder", version: "2.0", os: "creator" },
    { id: "growth.mission", version: "2.0", os: "growth" },
    { id: "ai.qa", version: "2.0", os: "ai" },
    { id: "operation.health", version: "2.0", os: "operation" },
    { id: "revenue.marketplace", version: "2.0", os: "revenue" },
  ];
  for (const s of core) {
    registerService({ ...s, status: "active" });
  }
}
