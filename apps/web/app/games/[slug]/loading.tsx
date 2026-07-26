import { Container } from "@game-platform/ui";

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/10 ${className ?? ""}`} aria-hidden />;
}

export default function GameDetailLoading() {
  return (
    <Container className="py-8" data-testid="game-detail-skeleton">
      <Shimmer className="mb-4 h-8 w-48" />
      <Shimmer className="mb-6 h-64 w-full rounded-2xl" />
      <div className="flex gap-2">
        <Shimmer className="h-10 w-32" />
        <Shimmer className="h-10 w-32" />
      </div>
    </Container>
  );
}
