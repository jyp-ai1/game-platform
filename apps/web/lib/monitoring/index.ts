import type { AnalyticsEventType } from "@/lib/supabase/analytics";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

type TrackOptions = {
  gameSlug?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
};

function safeTrack(
  eventType: AnalyticsEventType,
  options: TrackOptions = {}
): void {
  trackAnalyticsEvent(eventType, options).catch(() => {});
}

export function trackJsError(error: unknown, context: Record<string, unknown> = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  safeTrack("js_error", {
    metadata: {
      message: err.message,
      stack: err.stack?.slice(0, 2000),
      ...context,
    },
  });
}

export function trackApiError(
  url: string,
  status: number,
  context: Record<string, unknown> = {}
): void {
  safeTrack("api_error", {
    metadata: {
      url,
      status,
      ...context,
    },
  });
}

export function trackPage404(path: string): void {
  safeTrack("page_404", {
    metadata: { path },
  });
}

export function trackPerfMetric(name: string, value: number, unit = "ms"): void {
  safeTrack("perf_metric", {
    metadata: { name, value, unit },
  });
}

export function initClientMonitoring(deviceId?: string): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    safeTrack("js_error", {
      deviceId,
      metadata: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error instanceof Error ? event.error.stack?.slice(0, 2000) : undefined,
        source: "window.onerror",
      },
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    trackJsError(event.reason, { source: "unhandledrejection" });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const nav = entry as PerformanceNavigationTiming;
            trackPerfMetric("ttfb", nav.responseStart - nav.requestStart);
            trackPerfMetric("dom_content_loaded", nav.domContentLoadedEventEnd - nav.startTime);
          }
        }
      });
      observer.observe({ type: "navigation", buffered: true });

      return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        observer.disconnect();
      };
    } catch {
      // PerformanceObserver unsupported for navigation in some browsers.
    }
  }

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
