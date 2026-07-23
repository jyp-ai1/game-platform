"use client";

import { getDeviceId } from "@game-platform/game-sdk";
import { Button, cn } from "@game-platform/ui";
import { Heart } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  getServerFavoritesSnapshot,
  getFavoritesSnapshot,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/local-storage";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

export function FavoriteButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot
  );
  const favorite = favorites.includes(slug);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("backdrop-blur", className)}
      aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={favorite}
      onClick={(event) => {
        event.preventDefault();
        const adding = !favorite;
        toggleFavorite(slug);
        if (adding) {
          trackAnalyticsEvent("favorite", {
            gameSlug: slug,
            deviceId: getDeviceId(),
          }).catch(() => {});
        }
      }}
    >
      <Heart className={cn(favorite && "fill-current text-destructive")} />
    </Button>
  );
}
