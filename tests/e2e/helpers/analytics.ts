import type { Page, Request } from "@playwright/test";

export type AnalyticsEvent = {
  eventType: string;
  gameSlug?: string;
  metadata?: Record<string, unknown>;
};

export function attachAnalyticsCollector(page: Page) {
  const events: AnalyticsEvent[] = [];

  page.on("request", (req: Request) => {
    const url = req.url();
    if (!url.includes("track_analytics_event") || req.method() !== "POST") {
      return;
    }
    try {
      const body = req.postDataJSON() as Record<string, unknown> | null;
      if (!body) return;
      events.push({
        eventType: String(body.p_event_type ?? body.event_type ?? "unknown"),
        gameSlug: body.p_game_slug ? String(body.p_game_slug) : undefined,
        metadata: (body.p_metadata as Record<string, unknown>) ?? {},
      });
    } catch {
      /* ignore parse errors */
    }
  });

  return {
    getEvents: () => events,
    getEventTypes: () => [...new Set(events.map((e) => e.eventType))],
    assertHas: (...types: string[]) => {
      const found = new Set(events.map((e) => e.eventType));
      const missing = types.filter((t) => !found.has(t));
      if (missing.length) {
        throw new Error(
          `Missing analytics events: ${missing.join(", ")} (got: ${[...found].join(", ")})`
        );
      }
    },
  };
}
