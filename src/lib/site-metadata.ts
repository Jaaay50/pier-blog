import type { Metadata } from "next";

export const SITE_URL = "https://ethanpier.com";

const localeCopy = {
  en: {
    site: "Pier",
    homeTitle: "Pier — Frontend Engineer",
    homeDescription:
      "Frontend engineering, AI-native products, interaction design, and the craft of building for the web.",
    aboutTitle: "About Me — Pier",
    aboutDescription:
      "About Ethan Pier: frontend engineering, AI-native products, performance, accessibility, and interaction design.",
    portfolioTitle: "Portfolio — Pier",
    portfolioDescription:
      "Selected products and open-source tools by Ethan Pier, spanning frontend engineering, AI workflows, and developer tooling.",
    blogTitle: "Tides — Pier",
    blogDescription:
      "Writing about frontend engineering, AI integration, system design, and the craft of building for the web.",
    currentsTitle: "Currents — Pier",
    currentsDescription:
      "AI frontiers: papers, products, research, and industry moves.",
  },
  zh: {
    site: "Pier",
    homeTitle: "Pier — 前端工程师",
    homeDescription:
      "记录 AI 原生产品、前端工程、交互设计与 Web 构建实践的个人博客与作品集。",
    aboutTitle: "关于我 — Pier",
    aboutDescription:
      "Ethan Pier 的个人介绍：前端工程、AI 原生产品、性能优化、无障碍与交互设计。",
    portfolioTitle: "作品集 — Pier",
    portfolioDescription:
      "Ethan Pier 的精选作品与开源工具，涵盖前端工程、AI 工作流与开发者工具。",
    blogTitle: "潮聲 — Pier",
    blogDescription:
      "记录前端工程、AI 集成、系统设计，以及 Web 开发的思考与实践。",
    currentsTitle: "潮汐 — Pier",
    currentsDescription: "AI 前沿论文、产品、研究与行业动态。",
  },
} as const;

export type SiteLocale = keyof typeof localeCopy;
export type MetadataKind = "home" | "about" | "portfolio";
export type JsonLdKind = MetadataKind | "blog" | "currents";

function siteLocale(locale: string): SiteLocale {
  return locale === "zh" ? "zh" : "en";
}

function pagePath(locale: SiteLocale, kind: JsonLdKind): string {
  return `${SITE_URL}/${locale}${kind === "home" ? "" : `/${kind}`}`;
}

function pageTitle(locale: SiteLocale, kind: JsonLdKind): string {
  const copy = localeCopy[locale];
  switch (kind) {
    case "home":
      return copy.homeTitle;
    case "about":
      return copy.aboutTitle;
    case "portfolio":
      return copy.portfolioTitle;
    case "blog":
      return copy.blogTitle;
    case "currents":
      return copy.currentsTitle;
  }
}

function pageDescription(locale: SiteLocale, kind: JsonLdKind): string {
  const copy = localeCopy[locale];
  switch (kind) {
    case "home":
      return copy.homeDescription;
    case "about":
      return copy.aboutDescription;
    case "portfolio":
      return copy.portfolioDescription;
    case "blog":
      return copy.blogDescription;
    case "currents":
      return copy.currentsDescription;
  }
}

export function localizedMetadata(locale: string, kind: MetadataKind): Metadata {
  const safeLocale = siteLocale(locale);
  const copy = localeCopy[safeLocale];
  const title = pageTitle(safeLocale, kind);
  const description = pageDescription(safeLocale, kind);
  const canonical = pagePath(safeLocale, kind);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: pagePath("en", kind),
        zh: pagePath("zh", kind),
        "x-default": pagePath("en", kind),
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      locale: safeLocale === "zh" ? "zh_CN" : "en_US",
      siteName: copy.site,
      images: [{ url: `${SITE_URL}/og?type=site`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og?type=site`],
    },
  };
}

export function pageJsonLd(locale: string, kind: JsonLdKind) {
  const safeLocale = siteLocale(locale);
  const url = pagePath(safeLocale, kind);
  const person = {
    "@type": "Person",
    name: "Ethan Pier",
    url: SITE_URL,
    jobTitle: "Frontend Engineer",
    sameAs: ["https://github.com/Jia-Ethan"],
  };

  return {
    "@context": "https://schema.org",
    "@type":
      kind === "about"
        ? "ProfilePage"
        : kind === "portfolio" || kind === "blog" || kind === "currents"
          ? "CollectionPage"
          : "WebSite",
    name: pageTitle(safeLocale, kind),
    description: pageDescription(safeLocale, kind),
    url,
    inLanguage: safeLocale === "zh" ? "zh-CN" : "en-US",
    ...(kind === "home" ? { author: person, creator: person } : { mainEntity: person }),
  };
}
