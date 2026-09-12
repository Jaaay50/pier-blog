import type { Metadata } from "next";
import { SITE_URL, asSiteLocale, buildMetadata, formatPageTitle, type SiteLocale } from "./metadata";

export { SITE_URL, asSiteLocale, type SiteLocale };

const localeCopy = {
  en: {
    site: "Pier",
    homeTitle: "Pier — Full-Stack Engineer · AI-Native Products",
    homeDescription:
      "Full-stack engineering, AI-native products, data pipelines, and the craft of building for the web.",
    aboutTitle: "About Me",
    aboutDescription:
      "About Ethan Pier: full-stack engineering, AI-native products, data pipelines, performance, and accessibility.",
    portfolioTitle: "Portfolio",
    portfolioDescription:
      "Selected products and open-source tools by Ethan Pier, spanning AI products, full-stack engineering, data pipelines, and developer tooling.",
    blogTitle: "Tides",
    blogDescription:
      "Notes on work, interfaces, waiting, and writing.",
    currentsTitle: "Currents",
    currentsDescription:
      "AI papers, products, research, and industry news. A dozen sources ingested daily, with AI-generated bilingual summaries and scoring; reports on the same event merge automatically.",
  },
  zh: {
    site: "Pier",
    homeTitle: "Pier — 全栈工程师 · AI 原生产品",
    homeDescription:
      "记录 AI 原生产品、全栈工程、数据管线与 Web 构建实践的个人博客与作品集。",
    aboutTitle: "关于我",
    aboutDescription:
      "Ethan Pier 的个人介绍：全栈工程、AI 原生产品、数据管线、性能优化与无障碍。",
    portfolioTitle: "作品集",
    portfolioDescription:
      "Ethan Pier 的精选作品与开源工具，涵盖 AI 产品、全栈工程、数据管线与开发者工具。",
    blogTitle: "潮声",
    blogDescription:
      "一些关于工作、界面、等待和写作的观察。",
    currentsTitle: "潮汐",
    currentsDescription:
      "AI 前沿论文、产品、研究与行业动态。每日自动采集十余家信源，AI 生成双语摘要与评分，多信源事件自动合并去重。",
  },
} as const;

export type MetadataKind = "home" | "about" | "portfolio";
export type JsonLdKind = MetadataKind | "blog" | "currents";

function siteLocale(locale: string): SiteLocale {
  return asSiteLocale(locale);
}

function pagePath(locale: SiteLocale, kind: JsonLdKind): string {
  return kind === "home" ? "" : `/${kind}`;
}

function pageHeading(locale: SiteLocale, kind: JsonLdKind): string {
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

function pageTitle(locale: SiteLocale, kind: JsonLdKind): string {
  return formatPageTitle(pageHeading(locale, kind));
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
  return buildMetadata({
    locale: safeLocale,
    title: pageHeading(safeLocale, kind),
    description: pageDescription(safeLocale, kind),
    path: pagePath(safeLocale, kind),
  });
}

export function pageJsonLd(locale: string, kind: JsonLdKind) {
  const safeLocale = siteLocale(locale);
  const url = `${SITE_URL}/${safeLocale}${pagePath(safeLocale, kind)}`;
  const person = {
    "@type": "Person",
    name: "Ethan Pier",
    url: SITE_URL,
    jobTitle: "Full-Stack Engineer",
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
