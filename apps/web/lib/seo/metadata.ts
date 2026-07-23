import type { Game } from "@game-platform/shared";
import type { Metadata } from "next";

import { siteConfig } from "@/lib/site-config";
import { siteUrl } from "@/lib/site";

export const SEO_HOME_KEYWORDS = [
  "무료 온라인 게임",
  "오락실 게임",
  "퍼즐게임",
  "추억의 게임",
  "브라우저 게임",
  "레트로 게임",
  "아케이드 게임",
  "모바일 게임",
  "설치 없는 게임",
  "Re:Play",
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  puzzle: ["퍼즐게임", "두뇌게임", "무료 퍼즐"],
  arcade: ["오락실 게임", "아케이드", "클래식 게임"],
  retro: ["레트로 게임", "추억의 게임", "90년대 게임"],
  brain: ["두뇌게임", "기억력 게임", "순발력"],
  sports: ["스포츠 게임", "캐주얼 게임"],
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

export function buildHomeMetadata(): Metadata {
  const title = `${siteConfig.name} | 무료 온라인 게임 플랫폼`;
  const description =
    "오락실 게임, 퍼즐게임, 추억의 레트로 게임을 브라우저에서 무료로 즐기세요. 랭킹, 시즌, 업적, 저장/이어하기를 지원합니다.";

  return {
    title: { absolute: title },
    description,
    keywords: [...SEO_HOME_KEYWORDS, ...siteConfig.keywords],
    alternates: { canonical: siteUrl },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: siteConfig.name,
      type: "website",
      locale: "ko_KR",
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/opengraph-image")],
    },
    robots: { index: true, follow: true },
  };
}

export function buildGameMetadata(game: Game): Metadata {
  const title = `${siteConfig.name} | ${game.title} 무료 온라인 게임`;
  const description = `${game.title}을(를) 무료로 플레이하세요. ${game.description} 랭킹, 시즌, 업적, 저장/이어하기를 지원합니다.`;
  const url = absoluteUrl(`/games/${game.slug}`);
  const ogImage = absoluteUrl(`/games/${game.slug}/opengraph-image`);

  const indexable = game.status === "ACTIVE" || game.status === "COMING_SOON";

  return {
    title: { absolute: title },
    description,
    keywords: [
      game.title,
      `${game.title} 무료`,
      `${game.title} 온라인`,
      game.category?.name ?? "게임",
      ...(game.tags ?? []),
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale: "ko_KR",
      images: [{ url: ogImage, width: 1200, height: 630, alt: game.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function buildCategoryMetadata(category: {
  name: string;
  slug: string;
  description: string | null;
}): Metadata {
  const title = `${category.name} 게임 모음 | ${siteConfig.name}`;
  const description =
    category.description ??
    `${category.name} 카테고리의 무료 온라인 게임을 모아 플레이하세요.`;
  const url = absoluteUrl(`/categories/${category.slug}`);
  const extraKeywords = CATEGORY_KEYWORDS[category.slug] ?? [];

  return {
    title: { absolute: title },
    description,
    keywords: [category.name, `${category.name} 게임`, "무료 온라인 게임", ...extraKeywords],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
      locale: "ko_KR",
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export function buildGamesListMetadata(): Metadata {
  const title = `전체 게임 | ${siteConfig.name}`;
  const description =
    "Re:Play에서 제공하는 모든 무료 브라우저 게임 목록입니다. 퍼즐, 아케이드, 레트로 게임을 즐겨보세요.";
  const url = absoluteUrl("/games");

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
