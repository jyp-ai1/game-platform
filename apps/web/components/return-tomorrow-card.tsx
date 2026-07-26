"use client";

import type { PartyProgress } from "@game-platform/shared";
import Link from "next/link";

/** One reason to return tomorrow — D+1 hook */
export function ReturnTomorrowCard({
  partyProgress,
  revengeFriend,
}: {
  partyProgress?: PartyProgress;
  revengeFriend?: string | null;
}) {
  let emoji = "📅";
  let text = "내일 Quick Match — 친구와 한 판";
  let href = "/";

  if (partyProgress && partyProgress.streak >= 1) {
    emoji = "🔥";
    text = `내일 출석하면 ${partyProgress.streak + 1}일 Streak`;
    href = "/passport";
  } else if (revengeFriend) {
    emoji = "⚔️";
    text = `내일 ${revengeFriend}에게 리벤지`;
    href = "/flagship/snake-io";
  } else if (partyProgress && partyProgress.partyCoin > 0) {
    emoji = "🎁";
    text = "내일 Party Mission 보상 수령";
    href = "/passport";
  }

  return (
    <Link
      href={href}
      className="block rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm hover:border-amber-500/40 transition-colors"
    >
      <span className="mr-2">{emoji}</span>
      <span className="text-amber-100/90">{text}</span>
    </Link>
  );
}
