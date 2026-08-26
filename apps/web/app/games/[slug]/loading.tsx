/**
 * Shared loading for /games/[slug] and nested /play.
 * Must NOT look like a dead detail page (empty CTA pills) — that is the CEO
 * "cannot play from detail" failure mode during client navigation to /play.
 */
export default function GameSegmentLoading() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black"
      data-testid="game-play-loading"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      <p className="text-sm text-white/70">Entering…</p>
    </div>
  );
}
