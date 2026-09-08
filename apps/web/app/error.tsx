"use client";

import { Button, Container } from "@game-platform/ui";
import { useRouter } from "next/navigation";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay</p>
        <h1 className="mt-2 text-xl font-bold">Connection failed</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Retry or go back. Multiplayer does not fall back to Solo or Practice.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" onClick={() => router.push("/games/snake")}>
            Back
          </Button>
        </div>
      </Container>
    </main>
  );
}
