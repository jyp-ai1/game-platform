"use client";

import { useState } from "react";

import { getRating, setRating } from "@/lib/community-store";

export function StarRatingPanel({
  gameSlug,
  compact = false,
}: {
  gameSlug: string;
  compact?: boolean;
}) {
  const [rating, setLocalRating] = useState(() => getRating(gameSlug));

  function handleRate(stars: number) {
    setRating(gameSlug, stars);
    setLocalRating(stars);
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur"}>
      {!compact ? <h3 className="font-semibold">Rating</h3> : null}
      <div className={`flex gap-1 ${compact ? "mt-0" : "mt-2"} text-2xl`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={n <= rating ? "text-amber-400" : "text-muted-foreground hover:text-amber-300"}
            onClick={() => handleRate(n)}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function CommunityRatingsStrip({ games }: { games: { slug: string; title: string }[] }) {
  const [slug, setSlug] = useState(games[0]?.slug ?? "");

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h2 className="font-semibold">Reviews</h2>
      <select
        className="mt-3 w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        aria-label="게임"
      >
        {games.slice(0, 20).map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.title}
          </option>
        ))}
      </select>
      <div className="mt-3">
        <StarRatingPanel gameSlug={slug} compact />
      </div>
    </section>
  );
}
