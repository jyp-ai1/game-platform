import { Button } from "./button";

export function GameOverOverlay({
  message,
  onRestart,
}: {
  message: string;
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 backdrop-blur">
      <p className="text-xl font-semibold">{message}</p>
      <Button onClick={onRestart}>다시 시작</Button>
    </div>
  );
}
