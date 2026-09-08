"use client";

import { entryLogFail } from "@game-platform/game-snake";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Party link errors — Retry / Back only. No Practice fallback. */
export default function PartyLinkError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    entryLogFail("JOIN", error.message, { room: "party" });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-lg font-semibold">Connection failed</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Could not open this party link. Retry or go back.
      </p>
      <button
        type="button"
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold"
        onClick={() => router.push("/")}
      >
        Back
      </button>
    </div>
  );
}
