import Image from "next/image";

import { getScreenshotUrls } from "@/lib/game-screenshots";

export function ScreenshotGallery({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const urls = getScreenshotUrls(slug);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {urls.map((url, index) => (
        <div
          key={url}
          className="relative aspect-video overflow-hidden rounded-lg bg-muted"
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
