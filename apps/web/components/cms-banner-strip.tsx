import Image from "next/image";
import Link from "next/link";

import type { CmsBanner } from "@/lib/supabase/cms";

export function CmsBannerStrip({ banners }: { banners: CmsBanner[] }) {
  if (banners.length === 0) return null;

  return (
    <section className="border-b bg-muted/30 py-4">
      <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4">
        {banners.map((banner) => {
          const inner = (
            <div className="relative flex h-28 w-72 shrink-0 overflow-hidden rounded-xl border bg-card">
              <Image
                src={banner.image_url}
                alt={banner.title}
                fill
                className="object-cover"
                sizes="288px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 p-3 text-left text-white">
                <p className="text-sm font-semibold">{banner.title}</p>
                {banner.button_text ? (
                  <span className="text-xs text-white/80">{banner.button_text}</span>
                ) : null}
              </div>
            </div>
          );
          return banner.link_url ? (
            <Link key={banner.id} href={banner.link_url} className="shrink-0">
              {inner}
            </Link>
          ) : (
            <div key={banner.id}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
