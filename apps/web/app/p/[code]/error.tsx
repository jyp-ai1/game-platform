"use client";

import { entryLog, entryLogFail } from "@game-platform/game-snake";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Party link errors — never show global error; fall back to Snake Practice. */
export default function PartyLinkError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    entryLogFail("JOIN", error.message, { room: "party" });
    entryLog("PRACTICE_FALLBACK", "party-error.tsx");
    router.replace("/flagship/snake-io/play?room=PRACTICE&fallback=1");
  }, [error, router]);

  return (
    <p className="py-16 text-center text-sm text-muted-foreground">
      Practice Mode로 전환 중…
    </p>
  );
}
