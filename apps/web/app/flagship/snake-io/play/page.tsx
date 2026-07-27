import { SnakeIoPlayClientRoot } from "@/components/snake-io-play-client";
import { Suspense } from "react";

export const metadata = { title: "Replay Snake.io — Play" };

export default function SnakeIoPlayPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-start bg-background px-1 py-2 sm:px-2 sm:py-3">
      <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
        <SnakeIoPlayClientRoot />
      </Suspense>
    </main>
  );
}
