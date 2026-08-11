/**
 * Sitemap 生成核心：/sitemap.xml 是静态 sitemap index，实际 URL 分布在分片里。
 *
 * 分片边界即故障边界：
 * - static.xml：静态页 + Currents 主题页 + 博客文章，纯本地数据，永不依赖后端；
 * - currents-items.xml：资讯详情页（保持既有「最近 ≤500 条」语义）；
 * - currents-events-{0..f,other}.xml：全量事件详情页，按事件 id 首字符分 17 片，
 *   每片独立完整生成——后端/API 异常时该片返回 503 + no-store（搜索引擎保留旧版本、
 *   稍后重试），绝不输出半成品，也不把暂时故障缓存成空 sitemap。
 */
import { getAllSlugs, getPostsForLocale } from "@/lib/posts";
import { locales } from "@/i18n/config";
import { CURRENTS_API_BASE } from "@/lib/currents/api";
import { CHANGELOG_LAST_UPDATED } from "@/lib/currents/changelog";
import { CURRENTS_TOPIC_IDS } from "@/lib/currents/topics";

export const SITE_URL = "https://ethanpier.com";

/* ─────────────── 分片清单（index 与 dispatcher 共享，编译期常量） ─────────────── */

export const EVENT_SHARD_PREFIXES = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "other",
] as const;
export type EventShardPrefix = (typeof EVENT_SHARD_PREFIXES)[number];

export const SITEMAP_SHARD_NAMES = [
  "static.xml",
  "currents-items.xml",
  ...EVENT_SHARD_PREFIXES.map((p) => `currents-events-${p}.xml`),
] as const;

/* ─────────────── XML 构造（统一转义，输出合法 urlset / sitemapindex） ─────────────── */

export interface SitemapUrlEntry {
  loc: string;
  /** ISO 8601（UTC）时间或 YYYY-MM-DD；省略则不输出 lastmod */
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  /** 双语 alternate；x-default 固定指向 en */
  alternates?: { en: string; zh: string };
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntryXml(entry: SitemapUrlEntry): string {
  const parts: string[] = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
  if (entry.alternates) {
    const { en, zh } = entry.alternates;
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}" />`,
      `    <xhtml:link rel="alternate" hreflang="zh" href="${escapeXml(zh)}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(en)}" />`
    );
  }
  if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  if (entry.priority !== undefined) parts.push(`    <priority>${entry.priority}</priority>`);
  parts.push(`  </url>`);
  return parts.join("\n");
}

export function buildUrlsetXml(entries: SitemapUrlEntry[]): string {
  const hasAlternates = entries.some((e) => e.alternates);
  const xhtmlNs = hasAlternates ? ` xmlns:xhtml="http://www.w3.org/1999/xhtml"` : "";
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xhtmlNs}>`,
    ...entries.map(urlEntryXml),
    `</urlset>`,
    ``,
  ].join("\n");
}

export function buildSitemapIndexXml(sitemapUrls: string[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...sitemapUrls.map((u) => `  <sitemap>\n    <loc>${escapeXml(u)}</loc>\n  </sitemap>`),
    `</sitemapindex>`,
    ``,
  ].join("\n");
}

/* ─────────────── 工具 ─────────────── */

/** 双语页面对：/en/... 与 /zh/... 各一条，互挂 alternate。 */
function bilingualEntries(
  path: string,
  opts: { lastmod?: string; changefreq?: SitemapUrlEntry["changefreq"]; priority?: number }
): SitemapUrlEntry[] {
  const alternates = { en: `${SITE_URL}/en${path}`, zh: `${SITE_URL}/zh${path}` };
  return locales.map((locale) => ({
    loc: `${SITE_URL}/${locale}${path}`,
    ...opts,
    alternates,
  }));
}

/** lastmod 只输出真实可解析的时间；无效值省略字段（lastmod 可选），不补造。 */
function safeLastmod(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString();
}

/* ─────────────── static 分片：零后端依赖 ─────────────── */


export function buildStaticShardEntries(): SitemapUrlEntry[] {
  const posts = getPostsForLocale("en");
  const postDate = new Map(posts.map((p) => [p.slug, new Date(p.date).toISOString()]));
  // 站点级 lastmod 用最新文章日期，而不是构建时间——
  // 每次构建都刷新全站日期会降低搜索引擎对 lastmod 的信任
  const newestPostDate = posts.length
    ? new Date(Math.max(...posts.map((p) => new Date(p.date).getTime()))).toISOString()
    : new Date().toISOString();

  const staticPages: SitemapUrlEntry[] = [
    ...bilingualEntries("", { lastmod: newestPostDate, changefreq: "weekly", priority: 1.0 }),
    ...bilingualEntries("/blog", { lastmod: newestPostDate, changefreq: "weekly", priority: 0.9 }),
    ...bilingualEntries("/about", { lastmod: newestPostDate, changefreq: "monthly", priority: 0.7 }),
    ...bilingualEntries("/portfolio", { lastmod: newestPostDate, changefreq: "monthly", priority: 0.6 }),
    ...bilingualEntries("/lab", { lastmod: newestPostDate, changefreq: "monthly", priority: 0.8 }),
    ...bilingualEntries("/currents", { lastmod: newestPostDate, changefreq: "daily", priority: 0.8 }),
    ...bilingualEntries("/currents/daily", { lastmod: newestPostDate, changefreq: "daily", priority: 0.7 }),
    ...bilingualEntries("/currents/hot", { lastmod: newestPostDate, changefreq: "hourly", priority: 0.7 }),
    ...bilingualEntries("/currents/topics", { lastmod: newestPostDate, changefreq: "daily", priority: 0.7 }),
    ...bilingualEntries("/currents/changelog", {
      lastmod: new Date(CHANGELOG_LAST_UPDATED).toISOString(),
      changefreq: "weekly",
      priority: 0.5,
    }),
    ...bilingualEntries("/currents/agent", {
      lastmod: new Date(CHANGELOG_LAST_UPDATED).toISOString(),
      changefreq: "monthly",
      priority: 0.6,
    }),
    ...bilingualEntries("/feedback", {
      lastmod: new Date(CHANGELOG_LAST_UPDATED).toISOString(),
      changefreq: "monthly",
      priority: 0.5,
    }),
  ];

  const topicPages = CURRENTS_TOPIC_IDS.flatMap((id) =>
    bilingualEntries(`/currents/topics/${id}`, {
      lastmod: newestPostDate,
      changefreq: "daily",
      priority: 0.6,
    })
  );

  const postPages = getAllSlugs().flatMap((slug) =>
    bilingualEntries(`/blog/${slug}`, {
      lastmod: postDate.get(slug) ?? newestPostDate,
      changefreq: "monthly",
      priority: 0.8,
    })
  );

  return [...staticPages, ...topicPages, ...postPages];
}

/* ─────────────── currents-items 分片（保持既有「最近 ≤500 条」语义） ─────────────── */

/** 分片生成中的可重试故障：route handler 捕获后返回 503 + no-store。 */
export class SitemapShardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SitemapShardError";
  }
}

interface ItemsPageResponse {
  items: Array<{ id: string; publishedAt: string | null }>;
  nextCursor: string | null;
  hasMore: boolean;
}

export async function buildItemsShardEntries(
  fetchImpl: typeof fetch = fetch
): Promise<SitemapUrlEntry[]> {
  const ids: Array<{ id: string; publishedAt: string | null }> = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10 && ids.length < 500; page++) {
    const params = new URLSearchParams({ view: "all", limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetchImpl(`${CURRENTS_API_BASE}/v1/items?${params}`, { cache: "no-store" });
    // 分页中途失败即整片失败：绝不输出半截 sitemap
    if (!res.ok) throw new SitemapShardError(`items API ${res.status}`);
    const data = (await res.json()) as ItemsPageResponse;
    if (!Array.isArray(data.items)) throw new SitemapShardError("items contract violation");
    for (const item of data.items) {
      if (typeof item?.id !== "string" || !item.id) throw new SitemapShardError("items contract violation");
      ids.push({ id: item.id, publishedAt: item.publishedAt ?? null });
    }
    cursor = data.nextCursor;
    if (!data.hasMore || !cursor) break;
  }
  const seen = new Set<string>();
  const entries: SitemapUrlEntry[] = [];
  for (const item of ids) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    entries.push(
      ...bilingualEntries(`/currents/${item.id}`, {
        lastmod: safeLastmod(item.publishedAt),
        changefreq: "weekly",
        priority: 0.5,
      })
    );
  }
  return entries;
}

/* ─────────────── currents-events 分片（全量、确定、无重复） ─────────────── */

interface SitemapEventsPageResponse {
  schemaVersion: number;
  events: Array<{ eventId: string; lastActivityAt: string }>;
  nextCursor: string | null;
  hasMore: boolean;
}

/** 每片分页护栏：40 页 × 1000 = 4 万事件/片（全站 64 万）；超出视为异常而非静默截断。 */
const EVENT_SHARD_MAX_PAGES = 40;

export async function buildEventsShardEntries(
  prefix: EventShardPrefix,
  fetchImpl: typeof fetch = fetch
): Promise<SitemapUrlEntry[]> {
  const events: Array<{ eventId: string; lastActivityAt: string }> = [];
  let cursor: string | null = null;
  for (let page = 0; page < EVENT_SHARD_MAX_PAGES; page++) {
    const params = new URLSearchParams({ prefix, limit: "1000" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetchImpl(`${CURRENTS_API_BASE}/v1/sitemap/events?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new SitemapShardError(`sitemap events API ${res.status}`);
    let data: SitemapEventsPageResponse;
    try {
      data = (await res.json()) as SitemapEventsPageResponse;
    } catch {
      throw new SitemapShardError("sitemap events API invalid JSON");
    }
    if (data.schemaVersion !== 1 || !Array.isArray(data.events)) {
      throw new SitemapShardError("sitemap events contract violation");
    }
    for (const e of data.events) {
      if (typeof e?.eventId !== "string" || !e.eventId) {
        throw new SitemapShardError("sitemap events contract violation");
      }
      events.push({ eventId: e.eventId, lastActivityAt: e.lastActivityAt });
    }
    if (!data.hasMore) {
      // 完整遍历成功才生成 XML；防御性去重（后端契约已保证无重复）
      const seen = new Set<string>();
      const entries: SitemapUrlEntry[] = [];
      for (const ev of events) {
        if (seen.has(ev.eventId)) continue;
        seen.add(ev.eventId);
        entries.push(
          ...bilingualEntries(`/currents/events/${ev.eventId}`, {
            lastmod: safeLastmod(ev.lastActivityAt),
            changefreq: "hourly",
            priority: 0.6,
          })
        );
      }
      return entries;
    }
    if (typeof data.nextCursor !== "string" || !data.nextCursor) {
      throw new SitemapShardError("sitemap events contract violation");
    }
    cursor = data.nextCursor;
  }
  throw new SitemapShardError(`event shard ${prefix} pagination did not converge`);
}
