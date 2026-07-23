import type { Game } from "@game-platform/shared";

import { siteConfig } from "@/lib/site-config";

import { absoluteUrl } from "./metadata";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.subTagline,
  };
}

export function webSiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: `${siteConfig.tagline} ${siteConfig.subTagline}`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function gameJsonLd(game: Game): JsonLd {
  const url = absoluteUrl(`/games/${game.slug}`);
  const image = game.thumbnailUrl
    ? game.thumbnailUrl.startsWith("http")
      ? game.thumbnailUrl
      : absoluteUrl(game.thumbnailUrl)
    : absoluteUrl(`/games/${game.slug}/opengraph-image`);

  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    url,
    image,
    genre: game.category?.name,
    applicationCategory: "Game",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
    },
    ...(game.playCount > 0 ? { interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/PlayAction",
      userInteractionCount: game.playCount,
    } } : {}),
  };
}

export function softwareApplicationJsonLd(game: Game): JsonLd {
  const url = absoluteUrl(`/games/${game.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: game.title,
    description: game.description,
    url,
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
  };
}

export function categoryJsonLd(category: {
  name: string;
  slug: string;
  description: string | null;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} 게임`,
    description: category.description ?? `${category.name} 카테고리 게임 모음`,
    url: absoluteUrl(`/categories/${category.slug}`),
  };
}

export function jsonLdScript(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(Array.isArray(data) ? data : data);
}
