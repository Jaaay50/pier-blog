import type { Metadata } from "next";

export const SITE_URL = "https://ethanpier.com";

export type SiteLocale = "zh" | "en";

export function asSiteLocale(locale: string): SiteLocale {
  return locale === "zh" ? "zh" : "en";
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * title 不含 " — Pier" 后缀，由本函数统一加。
 * 已是 "Pier — …" 或已以 " — Pier" 结尾的绝对标题不再叠加。
 */
export function formatPageTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.startsWith("Pier — ") || trimmed.endsWith(" — Pier")) return trimmed;
  return `${trimmed} — Pier`;
}

export function buildMetadata(opts: {
  locale: SiteLocale;
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
}): Metadata {
  const { locale, title, description, image, type = "website" } = opts;
  const path = normalizePath(opts.path);
  const url = `${SITE_URL}/${locale}${path}`;
  const ogImage = image ?? `${SITE_URL}/og?type=site`;
  const fullTitle = formatPageTitle(title);

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/en${path}`,
        zh: `${SITE_URL}/zh${path}`,
        "x-default": `${SITE_URL}/en${path}`,
      },
    },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description,
      siteName: "Pier",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      ...(type === "article" && {
        publishedTime: opts.publishedTime,
        modifiedTime: opts.modifiedTime,
        ...(opts.tags ? { tags: opts.tags } : {}),
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

/** 页面 generateMetadata 入口：locale 字符串安全收敛后走 buildMetadata。 */
export function pageMetadata(
  locale: string,
  opts: Omit<Parameters<typeof buildMetadata>[0], "locale">,
): Metadata {
  return buildMetadata({ ...opts, locale: asSiteLocale(locale) });
}
