"use client";

import { Container } from "@game-platform/ui";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/10 ${className ?? ""}`}
      aria-hidden
    />
  );
}

/** Home first-paint skeleton — mirrors hero + continue + carousel layout. */
export function HomePageSkeleton() {
  return (
    <div data-testid="home-skeleton" className="flex flex-1 flex-col">
      <section className="border-b border-primary/20 bg-gradient-to-b from-primary/10 to-transparent py-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-3 px-4">
          <Shimmer className="min-h-[340px] w-full rounded-2xl" />
          <Shimmer className="h-10 w-full" />
        </div>
      </section>

      <section className="py-4 sm:py-5">
        <Container>
          <Shimmer className="mb-2 h-3 w-32" />
          <Shimmer className="h-16 w-full" />
        </Container>
      </section>

      <section className="border-b py-6 sm:py-10">
        <Container>
          <Shimmer className="mb-6 h-6 w-48" />
          <div className="flex gap-4 overflow-hidden">
            <Shimmer className="h-[340px] w-[300px] shrink-0" />
            <Shimmer className="h-[340px] w-[300px] shrink-0" />
          </div>
        </Container>
      </section>
    </div>
  );
}
