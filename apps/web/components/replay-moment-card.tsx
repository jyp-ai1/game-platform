"use client";

import type { ReplayMoment } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Share2 } from "lucide-react";

const MOMENT_STYLES: Record<string, string> = {
  triple_kill: "from-red-500/20 to-orange-500/10 border-red-500/30",
  top10_entry: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
  comeback: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
  boss_kill: "from-violet-500/20 to-purple-500/10 border-violet-500/30",
};

/** Replay Moment — SNS-style share card. */
export function ReplayMomentCard({
  moment,
  labels,
}: {
  moment: ReplayMoment;
  labels: Record<string, string>;
}) {
  const style = MOMENT_STYLES[moment.kind] ?? "from-primary/20 to-primary/5 border-primary/30";

  async function handleShare() {
    const text = `${moment.nickname} — ${labels[moment.kind] ?? moment.kind} · Re:Play`;
    if (navigator.share) {
      await navigator.share({ title: "Replay Moment", text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${style}`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Replay Moment</p>
      <p className="mt-1 text-lg font-bold">{labels[moment.kind] ?? moment.kind}</p>
      <p className="text-sm text-primary">{moment.nickname}</p>
      <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={handleShare}>
        <Share2 className="size-3" /> Share
      </Button>
    </div>
  );
}
