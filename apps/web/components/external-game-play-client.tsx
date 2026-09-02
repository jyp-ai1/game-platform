"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Fullscreen iframe player for externally registered games (MP-CTO-022).
 */
export function ExternalGamePlayClient({
  slug,
  title,
  playUrl,
}: {
  slug: string;
  title: string;
  playUrl: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  return (
    <div ref={rootRef} tabIndex={-1} className="flex h-full min-h-0 flex-col outline-none">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/80 px-3 py-2">
        <button
          type="button"
          data-testid="external-play-back-detail"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
              return;
            }
            router.replace(`/games/${slug}`);
          }}
          className="text-xs font-medium text-white/70 transition hover:text-white"
        >
          ← {title}
        </button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {blocked ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/70">
            <p>이 게임 URL을 iframe에서 불러올 수 없습니다.</p>
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 underline"
            >
              새 탭에서 열기
            </a>
          </div>
        ) : (
          <iframe
            data-testid="external-game-iframe"
            src={playUrl}
            title={title}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
            allow="fullscreen; gamepad"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setBlocked(true)}
          />
        )}
      </div>
    </div>
  );
}
