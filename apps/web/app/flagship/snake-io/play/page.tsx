import { SnakeIoGame } from "@game-platform/game-snake";
import { Suspense } from "react";

export const metadata = { title: "Replay Snake.io — Play" };

export default function SnakeIoPlayPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
        <SnakeIoGame />
      </Suspense>
    </main>
  );
}
