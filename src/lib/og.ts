/**
 * /og 社交卡片的可信数据解析（Phase 11B P1）。
 *
 * 旧实现直接根据公开 query（title/description/tags/readMin）渲染任意文案，
 * 允许第三方借本站域名生成任意内容的图片（品牌滥用/钓鱼素材）并污染 CDN 缓存。
 *
 * 收敛后 /og 只接受稳定的资源标识：
 *   - type=site                                  固定站点卡片
 *   - type=blog&locale=..&slug=..                从仓库文章解析
 *   - type=currents-item&locale=..&id=..         从 Currents API 解析
 *   - type=currents-event&locale=..&eventId=..   从 Currents API 解析
 *
 * 所有参数严格校验与限长；未知/多余/重复参数一律拒绝（同时防 CDN 缓存键
 * 污染）。未知资源返回 404；上游故障向上抛（路由层 503 + no-store），
 * 绝不缓存成 404。
 */
import { getPostBySlug } from "@/lib/posts";
import { serverFetchEventDetail, serverFetchItemDetail } from "@/lib/currents/api";
import { locales, type Locale } from "@/i18n/config";

export type OgRequest =
  | { type: "site" }
  | { type: "blog"; locale: Locale; slug: string }
  | { type: "currents-item"; locale: Locale; id: string }
  | { type: "currents-event"; locale: Locale; eventId: string };

export interface OgCardData {
  title: string;
  description: string;
  tags: string[];
  /** 仅博客文章卡片展示阅读时长 */
  readMin?: string;
}

/** 与后端 /v1 契约一致的资源 ID 白名单字符集 */
const RESOURCE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
/** 博客 slug：小写字母数字 + 连字符（与现有 slug 命名一致） */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

export const MAX_OG_TITLE_LENGTH = 160;
export const MAX_OG_DESCRIPTION_LENGTH = 260;
const MAX_OG_TAGS = 4;
const MAX_OG_TAG_LENGTH = 32;

const ALLOWED_PARAMS: Record<OgRequest["type"], readonly string[]> = {
  site: [],
  blog: ["locale", "slug"],
  "currents-item": ["locale", "id"],
  "currents-event": ["locale", "eventId"],
};

function isOgType(value: string): value is OgRequest["type"] {
  return Object.prototype.hasOwnProperty.call(ALLOWED_PARAMS, value);
}

function isLocale(value: string | null): value is Locale {
  return value !== null && (locales as readonly string[]).includes(value);
}

/**
 * 严格解析 /og 查询参数；任何不符合契约的输入返回 null（路由层 400）。
 * 旧式 title/description/tags/readMin 等自由文案参数属于未知参数，直接拒绝。
 */
export function parseOgParams(params: URLSearchParams): OgRequest | null {
  const type = params.get("type");
  if (type === null || !isOgType(type)) return null;

  const allowed = new Set<string>(["type", ...ALLOWED_PARAMS[type]]);
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (!allowed.has(key)) return null; // 未知参数（含旧式 title 等）
    if (seen.has(key)) return null; // 重复参数
    seen.add(key);
  }

  if (type === "site") return { type: "site" };

  const locale = params.get("locale");
  if (!isLocale(locale)) return null;

  if (type === "blog") {
    const slug = params.get("slug") ?? "";
    if (slug.length === 0 || slug.length > MAX_SLUG_LENGTH || !SLUG_RE.test(slug)) return null;
    return { type: "blog", locale, slug };
  }

  if (type === "currents-item") {
    const id = params.get("id") ?? "";
    if (!RESOURCE_ID_RE.test(id)) return null;
    return { type: "currents-item", locale, id };
  }

  const eventId = params.get("eventId") ?? "";
  if (!RESOURCE_ID_RE.test(eventId)) return null;
  return { type: "currents-event", locale, eventId };
}

/** 渲染前统一清洗：仅接受字符串，去首尾空白并限长。 */
function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
    .slice(0, MAX_OG_TAGS)
    .map((tag) => tag.trim().slice(0, MAX_OG_TAG_LENGTH));
}

/**
 * 从可信来源解析卡片内容。
 * 返回 null = 资源确实不存在（404）；上游故障沿用 CurrentsServerFetchError
 * 向上抛，由路由层转成 503 + no-store。
 */
export async function resolveOgData(request: OgRequest): Promise<OgCardData | null> {
  switch (request.type) {
    case "site":
      return {
        title: "Pier — Frontend Engineer",
        description: "Personal blog and portfolio by Ethan Pier",
        tags: [],
      };

    case "blog": {
      const post = getPostBySlug(request.slug, request.locale);
      if (!post) return null;
      const readMinutes = Number(post.readMinutes);
      return {
        title: clampText(post.title, MAX_OG_TITLE_LENGTH),
        description: clampText(post.description, MAX_OG_DESCRIPTION_LENGTH),
        tags: cleanTags(post.tags),
        ...(Number.isFinite(readMinutes) && readMinutes > 0
          ? { readMin: String(Math.min(Math.round(readMinutes), 999)) }
          : {}),
      };
    }

    case "currents-item": {
      const item = await serverFetchItemDetail(request.id, request.locale);
      if (!item) return null;
      const title =
        clampText(item.title, MAX_OG_TITLE_LENGTH) || clampText(item.originalTitle, MAX_OG_TITLE_LENGTH);
      return {
        title: title || "潮汐 · Currents",
        description:
          clampText(item.summary, MAX_OG_DESCRIPTION_LENGTH) || clampText(item.reason, MAX_OG_DESCRIPTION_LENGTH),
        tags: cleanTags(item.tags),
      };
    }

    case "currents-event": {
      const event = await serverFetchEventDetail(request.eventId, request.locale);
      if (!event) return null;
      return {
        title: clampText(event.title, MAX_OG_TITLE_LENGTH) || "潮汐 · Currents",
        description:
          clampText(event.summary, MAX_OG_DESCRIPTION_LENGTH) ||
          clampText(event.progress, MAX_OG_DESCRIPTION_LENGTH),
        tags: [],
      };
    }
  }
}
