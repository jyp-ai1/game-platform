"use client";

import { useEffect } from "react";

import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

/**
 * Captures window.onerror and unhandledrejection on game pages.
 * Sends to analytics_events as `error` for QA/monitoring.
 */
export function GameErrorMonitor({ gameSlug }: { gameSlug: string }) {
  useEffect(() => {
    function onError(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) {
      const msg =
        typeof message === "string"
          ? message
          : error?.message ?? "Unknown error";
      trackAnalyticsEvent("error", {
        gameSlug,
        metadata: {
          type: "window.onerror",
          message: msg.slice(0, 500),
          source: source ?? "",
          line: lineno ?? 0,
          col: colno ?? 0,
        },
      }).catch(() => {});
    }

    function onRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      trackAnalyticsEvent("error", {
        gameSlug,
        metadata: { type: "unhandledrejection", message: msg.slice(0, 500) },
      }).catch(() => {});
    }

    const prevOnError = window.onerror;
    window.onerror = (...args) => {
      onError(args[0], args[1], args[2], args[3], args[4]);
      if (typeof prevOnError === "function") {
        return prevOnError.apply(window, args);
      }
      return false;
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.onerror = prevOnError;
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [gameSlug]);

  return null;
}
