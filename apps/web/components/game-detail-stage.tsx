/**
 * Expands embedded game canvases (max-w-sm) on desktop without editing each game package.
 */
export function GameDetailStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        "game-detail-stage w-full",
        "[&_.standard-game-shell]:mx-auto [&_.standard-game-shell]:w-full",
        "[&_.standard-game-shell]:max-w-[min(100%,20rem)]",
        "sm:[&_.standard-game-shell]:max-w-[min(100%,24rem)]",
        "lg:[&_.standard-game-shell]:max-w-[min(100%,28rem)]",
        "xl:[&_.standard-game-shell]:max-w-[min(100%,32rem)]",
        "[&_.standard-game-canvas]:mx-auto [&_.standard-game-canvas]:w-full",
        "[&_.max-w-sm]:mx-auto [&_.max-w-sm]:w-full",
        "[&_.max-w-sm]:max-w-[min(100%,24rem)]",
        "sm:[&_.max-w-sm]:max-w-[min(100%,26rem)]",
        "lg:[&_.max-w-sm]:max-w-[min(100%,34rem)]",
        "xl:[&_.max-w-sm]:max-w-[min(100%,40rem)]",
        "2xl:[&_.max-w-sm]:max-w-[min(100%,44rem)]",
      ].join(" ")}
    >
      <div className="rounded-2xl border bg-card/50 p-4 shadow-sm lg:p-6">
        {children}
      </div>
    </div>
  );
}
