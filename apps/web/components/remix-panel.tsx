"use client";

import { Button } from "@game-platform/ui";
import { GitBranch } from "lucide-react";
import { useState } from "react";

import { createRemix, getRemixVariants, type RemixVariant } from "@/lib/creator/remix-engine";

/** Replay Remix — fork games into variants. */
export function RemixPanel({ baseSlug, baseTitle }: { baseSlug: string; baseTitle: string }) {
  const variants = getRemixVariants(baseSlug);
  const [created, setCreated] = useState<string | null>(null);

  if (variants.length === 0) return null;

  function handleRemix(v: RemixVariant) {
    const game = createRemix(baseSlug, baseTitle, v);
    setCreated(game.title);
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="flex items-center gap-2">
        <GitBranch className="size-4 text-amber-400" />
        <h3 className="font-semibold">Replay Remix</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{baseTitle} → 새 변형 게임 생성</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {variants.map((v) => (
          <Button key={v.id} size="sm" variant="outline" onClick={() => handleRemix(v)}>
            {v.label}
          </Button>
        ))}
      </div>
      {created ? (
        <p className="mt-3 text-sm text-emerald-400">✓ Remix created: {created}</p>
      ) : null}
    </section>
  );
}
