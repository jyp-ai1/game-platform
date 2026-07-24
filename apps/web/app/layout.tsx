import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { JsonLdScript } from "@/components/json-ld-script";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AnalyticsBridge } from "@/components/analytics-bridge";
import { MonitoringProvider } from "@/components/monitoring-provider";
import { PlatformFlagsSync } from "@/components/platform-flags-sync";
import { getPlatformFlagsFromDb } from "@/lib/feature-flags";
import { ToastHost } from "@/components/toast/toast-host";
import { siteConfig } from "@/lib/site-config";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo";
import { fetchSeoVerification } from "@/lib/supabase/seo-public";
import { siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = `${siteConfig.tagline} ${siteConfig.subTagline}`;

export async function generateMetadata(): Promise<Metadata> {
  const verification = await fetchSeoVerification();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    keywords: [...siteConfig.keywords],
    openGraph: {
      title: siteConfig.name,
      description,
      siteName: siteConfig.name,
      type: "website",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: siteUrl,
    },
    verification: {
      ...(verification.google ? { google: verification.google } : {}),
      ...(verification.bing ? { other: { "msvalidate.01": verification.bing } } : {}),
    },
    other: {
      ...(verification.naver ? { "naver-site-verification": verification.naver } : {}),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const platformFlags = await getPlatformFlagsFromDb();

  return (
    <html
      lang="ko"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Mounted before {children} so its event subscription is registered
            before any page content's mount effects can emit an event (React
            fires mount effects in tree order — a component declared after
            {children} would subscribe too late to catch an event emitted
            during the very same initial commit, e.g. the "첫 게임 플레이"
            achievement on a hard-loaded game page). */}
        <ToastHost />
        <PlatformFlagsSync flags={platformFlags} />
        <AnalyticsBridge />
        <MonitoringProvider />
        <JsonLdScript data={[organizationJsonLd(), webSiteJsonLd()]} />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
