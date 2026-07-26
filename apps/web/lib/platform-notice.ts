"use client";

import { emitEngagementEvent } from "@game-platform/game-sdk";

/** User-facing platform notices — toast + optional retry hint. */
export function emitPlatformNotice(title: string, message: string): void {
  emitEngagementEvent({ type: "platform-notice", title, message });
}

export function emitPlatformNoticeWithRetry(title: string, message: string): void {
  emitEngagementEvent({
    type: "platform-notice",
    title,
    message: `${message} · 다시 시도해 주세요.`,
  });
}
