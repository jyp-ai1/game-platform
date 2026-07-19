import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";
import { getGameBySlug } from "@/lib/supabase/games";

export const alt = "Game preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  const title = game?.title ?? siteConfig.name;
  const description = game?.description ?? siteConfig.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F172A",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(91,91,214,0.35), transparent 55%), radial-gradient(circle at 75% 75%, rgba(255,184,0,0.2), transparent 55%)",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
          padding: "0 80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: "#94A3B8" }}>
          {siteConfig.name}
        </div>
        <div
          style={{ fontSize: 80, fontWeight: 700, color: "#5B5BD6", marginTop: 16 }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 20,
            color: "#F8FAFC",
            maxWidth: 900,
          }}
        >
          {description}
        </div>
      </div>
    ),
    { ...size }
  );
}
