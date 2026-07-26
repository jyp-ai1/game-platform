"use client";

import type { DialogueLine } from "@/lib/company-os-types";
import { useEffect, useState } from "react";

/** Conversational AI PM — dialogue bubbles, not cards */
export function ConversationalBriefing({ lines }: { lines: DialogueLine[] }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function showNext() {
      if (i >= lines.length) return;
      const delay = lines[i]?.pauseMs ?? 400;
      timers.push(
        setTimeout(() => {
          i += 1;
          setVisibleCount(i);
          showNext();
        }, delay)
      );
    }
    showNext();
    return () => timers.forEach(clearTimeout);
  }, [lines]);

  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        AI PM 브리핑
      </p>
      <div className="space-y-3">
        {lines.slice(0, visibleCount).map((line) => (
          <div
            key={line.id}
            className="max-w-lg animate-in fade-in slide-in-from-bottom-2 rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/5 px-5 py-4"
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{line.text}</p>
          </div>
        ))}
        {visibleCount < lines.length ? (
          <div className="flex gap-1 px-2 py-1">
            <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
            <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
            <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
