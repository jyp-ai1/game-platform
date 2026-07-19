"use client";

import { Button, Container, SectionTitle } from "@game-platform/ui";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <SectionTitle
          title="문제가 발생했습니다"
          description="일시적인 오류일 수 있습니다. 다시 시도해주세요."
        />
        <Button className="mt-8" onClick={reset}>
          다시 시도
        </Button>
      </Container>
    </main>
  );
}
