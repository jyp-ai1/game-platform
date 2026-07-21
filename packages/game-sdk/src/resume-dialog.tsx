"use client";

import { Button } from "@game-platform/ui";

interface ResumeDialogProps {
  gameTitle: string;
  onResume: () => void;
  onNewGame: () => void;
}

// Board-scoped overlay (absolute, not fixed like NicknameModal) — sits inside
// each game's own `relative` root wrapper, same containing-block convention
// as GameOverOverlay. z-40 so it stays below nothing else active at mount
// time but above the board itself (GameOverOverlay/NicknameModal use higher
// z-indices but never appear simultaneously with this dialog in practice).
export function ResumeDialog({
  gameTitle,
  onResume,
  onNewGame,
}: ResumeDialogProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-xs rounded-xl border bg-background p-6 text-center shadow-lg">
        <p className="text-lg font-semibold">저장된 게임이 있어요</p>
        <p className="mt-1 text-sm text-muted-foreground">{gameTitle}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={onResume}>이어하기</Button>
          <Button variant="outline" onClick={onNewGame}>
            새 게임
          </Button>
        </div>
      </div>
    </div>
  );
}
