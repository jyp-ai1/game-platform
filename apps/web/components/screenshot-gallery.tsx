import Image from "next/image";

import { getScreenshotUrls } from "@/lib/game-screenshots";

export function ScreenshotGallery({
  slug,
  title,
  compact = false,
}: {
  slug: string;
  title: string;
  compact?: boolean;
}) {
  const urls = getScreenshotUrls(slug);

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2"
          : "grid grid-cols-1 gap-3 sm:grid-cols-3"
      }
    >
      {urls.map((url, index) => (
        <div
          key={url}
          className={`relative overflow-hidden rounded-lg bg-muted ${
            compact ? "aspect-video w-full" : "aspect-video"
          }`}
        >
          <Image
            src={url}
            alt={`${title} 스크린샷 ${index + 1}`}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 33vw, 100vw"
          />
        </div>
      ))}
    </div>
  );
}
