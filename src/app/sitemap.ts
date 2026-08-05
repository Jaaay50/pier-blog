import { MetadataRoute } from "next";
import { getAllSlugs, getPostsForLocale } from "@/lib/posts";
import { locales } from "@/i18n/config";

const baseUrl = "https://ethanpier.com";

/** 双 locale 页面的 hreflang alternates（含 x-default → en） */
function langAlternates(path: string) {
  return {
    languages: {
      en: `${baseUrl}/en${path}`,
      zh: `${baseUrl}/zh${path}`,
      "x-default": `${baseUrl}/en${path}`,
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getAllSlugs();

  // 文章日期索引：slug -> date（en 版为准，双语同日）
  const posts = getPostsForLocale("en");
  const postDate = new Map(posts.map((p) => [p.slug, new Date(p.date)]));

  // 站点级 lastModified 用最新文章日期，而不是构建时间——
  // 每次构建都刷新全站日期会降低搜索引擎对 lastmod 的信任
  const newestPostDate = posts.length
    ? new Date(Math.max(...posts.map((p) => new Date(p.date).getTime())))
    : new Date();

  const staticPages = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: newestPostDate,
      changeFrequency: "weekly" as const,
      priority: 1.0,
      alternates: langAlternates(""),
    },
    {
      url: `${baseUrl}/${locale}/blog`,
      lastModified: newestPostDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: langAlternates("/blog"),
    },
    {
      url: `${baseUrl}/${locale}/about`,
      lastModified: newestPostDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: langAlternates("/about"),
    },
    {
      url: `${baseUrl}/${locale}/portfolio`,
      lastModified: newestPostDate,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: langAlternates("/portfolio"),
    },
    {
      url: `${baseUrl}/${locale}/lab`,
      lastModified: newestPostDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: langAlternates("/lab"),
    },
    {
      url: `${baseUrl}/${locale}/currents`,
      lastModified: newestPostDate,
      changeFrequency: "daily" as const,
      priority: 0.8,
      alternates: langAlternates("/currents"),
    },
  ]);

  const postPages = locales.flatMap((locale) =>
    slugs.map((slug) => ({
      url: `${baseUrl}/${locale}/blog/${slug}`,
      lastModified: postDate.get(slug) ?? newestPostDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: langAlternates(`/blog/${slug}`),
    }))
  );

  return [...staticPages, ...postPages];
}
