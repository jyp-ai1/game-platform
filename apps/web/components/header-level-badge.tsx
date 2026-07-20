"use client";

import {
  getLevel,
  getServerLevelSnapshot,
  subscribeEngagement,
} from "@game-platform/game-sdk";
import { Badge } from "@game-platform/ui";
import { useSyncExternalStore } from "react";

export function HeaderLevelBadge() {
  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevel,
    getServerLevelSnapshot
  );

  return (
    <Badge variant="outline" className="mr-1 hidden sm:inline-flex">
      Lv.{level}
    </Badge>
  );
}
