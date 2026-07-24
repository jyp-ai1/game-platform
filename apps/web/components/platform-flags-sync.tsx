"use client";

import {
  configurePlatformFlags,
  type PlatformFlags,
} from "@game-platform/game-sdk";
import { useLayoutEffect } from "react";

/** Syncs server-fetched feature flags into game-sdk runtime behavior. */
export function PlatformFlagsSync({ flags }: { flags: PlatformFlags }) {
  useLayoutEffect(() => {
    configurePlatformFlags(flags);
  }, [flags]);

  return null;
}
