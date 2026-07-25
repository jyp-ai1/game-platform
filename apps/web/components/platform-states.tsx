import Link from "next/link";

import { Button } from "@game-platform/ui";

export function PlatformEmpty({
  title = "Nothing here yet",
  actionHref = "/games",
  actionLabel = "Play",
}: {
  title?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-card/30 px-6 py-16 text-center backdrop-blur">
      <p className="text-lg font-semibold">{title}</p>
      <Button className="mt-4" nativeButton={false} render={<Link href={actionHref}>{actionLabel}</Link>} />
    </div>
  );
}

export function PlatformSkeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/40 ${className}`} />;
}
