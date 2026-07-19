import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
        }}
      >
        <div style={{ fontSize: 104, fontWeight: 700, color: "#5B5BD6" }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 36, marginTop: 20, fontWeight: 600 }}>
          {siteConfig.tagline}
        </div>
        <div style={{ fontSize: 26, marginTop: 16, color: "#94A3B8" }}>
          {siteConfig.subTagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
