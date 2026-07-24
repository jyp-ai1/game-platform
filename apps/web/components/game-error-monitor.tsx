"use client";

import { useEffect } from "react";

import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

function reportGameError(
  gameSlug: string,
  type: string,
  message: string,
  extra: Record<string, unknown> = {}
) {
  trackAnalyticsEvent("error", {
    gameSlug,
    metadata: { type, message: message.slice(0, 500), ...extra },
  }).catch(() => {});
}

/**
 * Captures window.onerror, unhandledrejection, and console.error on game pages.
 * Sends to analytics_events as `error` for QA/monitoring.
 */
export function GameErrorMonitor({ gameSlug }: { gameSlug: string }) {
  useEffect(() => {
    function onError(
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) {
      const msg =
        typeof message === "string" ? message : error?.message ?? "Unknown error";
      reportGameError(gameSlug, "window.onerror", msg, {
        source: source ?? "",
        line: lineno ?? 0,
        col: colno ?? 0,
      });
    }

    function onRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      reportGameError(gameSlug, "unhandledrejection", msg);
    }

    const prevOnError = window.onerror;
    window.onerror = (...args) => {
      onError(args[0], args[1], args[2], args[3], args[4]);
      if (typeof prevOnError === "function") {
        return prevOnError.apply(window, args);
      }
      return false;
    };

    const prevConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args
        .map((a) => {
          if (a instanceof Error) return a.message;
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
      if (msg) {
        reportGameError(gameSlug, "console.error", msg);
      }
      prevConsoleError.apply(console, args);
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.onerror = prevOnError;
      console.error = prevConsoleError;
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [gameSlug]);

  return null;
}
