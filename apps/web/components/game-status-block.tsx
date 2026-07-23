import type { GameStatus } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Construction, EyeOff, Hourglass } from "lucide-react";
import Link from "next/link";

const STATUS_COPY: Record<
  Exclude<GameStatus, "ACTIVE">,
  { title: string; message: string; icon: typeof Construction }
> = {
  MAINTENANCE: {
    title: "점검 중",
    message:
      "현재 서버 점검 또는 업데이트 작업 중입니다. 잠시 후 다시 이용해 주세요.",
    icon: Construction,
  },
  COMING_SOON: {
    title: "Coming Soon",
    message: "이 게임은 곧 만나보실 수 있습니다.",
    icon: Hourglass,
  },
  HIDDEN: {
    title: "비공개",
    message: "현재 이 게임은 운영자에 의해 숨김 처리되어 있습니다.",
    icon: EyeOff,
  },
};

export function GameStatusBlock({ status }: { status: Exclude<GameStatus, "ACTIVE"> }) {
  const copy = STATUS_COPY[status];
  const Icon = copy.icon;

  return (
    <div className="mt-8 max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-amber-400" />
        <div>
          <p className="font-semibold">{copy.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{copy.message}</p>
          <Button
            variant="outline"
            className="mt-4 w-fit"
            nativeButton={false}
            render={<Link href="/games">다른 게임 둘러보기</Link>}
          />
        </div>
      </div>
    </div>
  );
}
