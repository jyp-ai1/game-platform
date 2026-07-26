"use client";

import { Button, Container } from "@game-platform/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { emitPlatformNoticeWithRetry } from "@/lib/platform-notice";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    emitPlatformNoticeWithRetry("연결", "일시적으로 불안정합니다.");
  }, []);

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay</p>
        <h1 className="mt-2 text-xl font-bold">잠시 연결이 불안정합니다</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          홈으로 돌아가 다시 시도해 주세요. 문제가 계속되면 연습 모드로 플레이할 수 있습니다.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => router.push("/")}>홈으로</Button>
          <Button variant="outline" onClick={reset}>
            다시 시도
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a href="/flagship/snake-io/play?room=PRACTICE&fallback=1">연습 모드</a>
            }
          />
        </div>
      </Container>
    </main>
  );
}
