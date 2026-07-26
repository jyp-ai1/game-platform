"use client";

import { CONTINUE_GAMES, continueTogether } from "@game-platform/replay-engine/social";
import { Button } from "@game-platform/ui";
import { ArrowRight, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Continue Together — post-game next game picker (Steam-style). */
export function ContinueTogetherPanel({
  partyId,
  currentGameSlug,
  onRematch,
}: {
  partyId: string | null;
  currentGameSlug: string;
  onRematch?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleNext(slug: string) {
    if (!partyId) {
      router.push(CONTINUE_GAMES.find((g) => g.slug === slug)?.href ?? "/games");
      return;
    }
    setLoading(slug);
    const result = await continueTogether(partyId, slug);
    setLoading(null);
    if (result) {
      const href = slug === "snake"
        ? `/flagship/snake-io/play?room=${result.roomCode}`
        : `/games/${slug}?room=${result.roomCode}`;
      router.push(href);
    } else {
      router.push(`/p/${partyId}`);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <p className="text-sm font-semibold text-emerald-400">같이 다음 게임?</p>
      <p className="mt-1 text-xs text-muted-foreground">Party 유지 · 다른 게임으로 이동</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CONTINUE_GAMES.filter((g) => g.slug !== currentGameSlug).map((g) => (
          <Button
            key={g.slug}
            size="sm"
            variant="outline"
            disabled={loading === g.slug}
            onClick={() => handleNext(g.slug)}
            className="gap-1"
          >
            {g.label} <ArrowRight className="size-3" />
          </Button>
        ))}
        <Button size="sm" onClick={onRematch} className="gap-1">
          <Swords className="size-3" /> 리벤지
        </Button>
      </div>
    </div>
  );
}
