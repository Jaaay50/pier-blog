import { MetadataRoute } from "next";
import { getAllSlugs, getPostsForLocale } from "@/lib/posts";
import { locales } from "@/i18n/config";
import { CURRENTS_API_BASE } from "@/lib/currents/api";

const baseUrl = "https://ethanpier.com";

export const revalidate = 3600;

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    {
      url: `${baseUrl}/${locale}/currents/daily`,
      lastModified: newestPostDate,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: langAlternates("/currents/daily"),
    },
    {
      url: `${baseUrl}/${locale}/currents/hot`,
      lastModified: newestPostDate,
      changeFrequency: "hourly" as const,
      priority: 0.7,
      alternates: langAlternates("/currents/hot"),
    },
    {
      url: `${baseUrl}/${locale}/currents/topics`,
      lastModified: newestPostDate,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: langAlternates("/currents/topics"),
    },
  ]);

  // Currents 主题详情页：主题 id 清单与后端 src/topics.ts 保持一致
  const CURRENTS_TOPIC_IDS = [
    "openai", "anthropic", "google", "meta", "mistral", "qwen", "xai", "deepseek",
    "nvidia", "microsoft", "apple", "bytedance",
    "llm", "agent", "multimodal", "video", "image", "audio", "robotics", "reasoning",
    "rl", "rag", "embeddings", "finetuning", "inference", "hardware", "safety",
    "memory", "planning", "code", "mcp", "benchmark", "transformer",
    "opensource", "papers", "product-launch", "policy", "funding",
  ];
  const topicPages = locales.flatMap((locale) =>
    CURRENTS_TOPIC_IDS.map((id) => ({
      url: `${baseUrl}/${locale}/currents/topics/${id}`,
      lastModified: newestPostDate,
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: langAlternates(`/currents/topics/${id}`),
    }))
  );

  // Currents 详情页条目：服务端拉取最近 N 条（失败降级为静态页，不拖垮构建）
  let currentsPages: MetadataRoute.Sitemap = [];
  try {
    const ids: Array<{ id: string; publishedAt: string | null }> = [];
    let cursor: string | null = null;
    for (let page = 0; page < 10 && ids.length < 500; page++) {
      const params = new URLSearchParams({ view: "all", limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`${CURRENTS_API_BASE}/v1/items?${params}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        items: Array<{ id: string; publishedAt: string | null }>;
        nextCursor: string | null;
        hasMore: boolean;
      };
      ids.push(...data.items.map((i) => ({ id: i.id, publishedAt: i.publishedAt })));
      cursor = data.nextCursor;
      if (!data.hasMore || !cursor) break;
    }
    currentsPages = locales.flatMap((locale) =>
      ids.map((item) => ({
        url: `${baseUrl}/${locale}/currents/${item.id}`,
        lastModified: item.publishedAt ? new Date(item.publishedAt) : newestPostDate,
        changeFrequency: "weekly" as const,
        priority: 0.5,
        alternates: langAlternates(`/currents/${item.id}`),
      }))
    );
  } catch {
    currentsPages = []; // 降级：只输出静态页
  }

  const postPages = locales.flatMap((locale) =>
    slugs.map((slug) => ({
      url: `${baseUrl}/${locale}/blog/${slug}`,
      lastModified: postDate.get(slug) ?? newestPostDate,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: langAlternates(`/blog/${slug}`),
    }))
  );

  return [...staticPages, ...topicPages, ...postPages, ...currentsPages];
}
