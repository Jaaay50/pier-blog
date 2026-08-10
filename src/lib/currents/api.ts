/**
 * Currents 只读 API 客户端。
 * - 客户端组件（"use client" 数据岛）：通过浏览器 fetch
 * - 详情页/日报页（ISR Server Component）：服务端 fetch，配 next.revalidate
 * 页面壳保持 SSG；仅 /currents/[id] 与 /currents/daily* 为 ISR。
 */
import type {
  CurrentsDailyArchiveResponse,
  CurrentsDailyReport,
  CurrentsEventDetail,
  CurrentsHighlightsResponse,
  CurrentsHotResponse,
  CurrentsItemDetail,
  CurrentsItemsResponse,
  CurrentsSource,
  CurrentsStats,
  CurrentsTopicItemsResponse,
  CurrentsTopicsResponse,
} from "./types";

export const CURRENTS_API_BASE = process.env.NEXT_PUBLIC_CURRENTS_API_BASE ?? "https://currents-api.ethanpier.com";

/** 客户端运行时读取：生产走构建内联常量；本地 QA 可用 window.__CURRENTS_API_BASE 覆盖。 */
function clientApiBase(): string {
  if (typeof window !== "undefined") {
    const override = (window as unknown as Record<string, unknown>).__CURRENTS_API_BASE;
    if (typeof override === "string" && override) return override;
  }
  return CURRENTS_API_BASE;
}

export class CurrentsApiError extends Error {
  status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "CurrentsApiError";
    this.status = status;
  }
}

/** 服务端 ISR 详情页专用：只有「后端明确 404」才视为资源不存在；其余全部是可重试故障。 */
export class CurrentsServerFetchError extends Error {
  readonly kind: "http" | "network" | "invalid-json" | "contract";
  readonly status: number | null;
  constructor(kind: "http" | "network" | "invalid-json" | "contract", status: number | null, message: string) {
    super(message);
    this.name = "CurrentsServerFetchError";
    this.kind = kind;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableHttpUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const EVENT_TYPES = new Set(["news", "product", "research"]);
const EVENT_LIFECYCLES = new Set(["new", "rising", "peak", "cooling", "ended"]);
const EVENT_STATUSES = new Set([...EVENT_LIFECYCLES, "active"]);
const EVENT_ROLES = new Set(["official", "media", "community", "aggregator"]);

/** 事件详情 ISR 的运行时契约；防止旧实例、缓存或异常 JSON 以半成品进入页面。 */
export function isCurrentsEventDetail(value: unknown): value is CurrentsEventDetail {
  if (!isRecord(value)) return false;

  const stringFields = ["eventId", "requestedId", "firstSeenAt", "latestActivityAt"];
  const nullableStringFields = ["itemId", "title", "titleZh", "titleEn", "progress", "summary", "splitParent"];
  const numberFields = [
    "heat",
    "independentReportCount",
    "officialReportCount",
    "communityScoreMax",
    "communityCommentsMax",
    "communityBoost",
    "reportCount",
    "itemCount",
  ];
  if (!stringFields.every((key) => typeof value[key] === "string")) return false;
  if (!nullableStringFields.every((key) => isNullableString(value[key]))) return false;
  if (!numberFields.every((key) => typeof value[key] === "number" && Number.isFinite(value[key] as number))) return false;
  if (typeof value.resolvedFromAlias !== "boolean") return false;
  if (typeof value.eventType !== "string" || !EVENT_TYPES.has(value.eventType)) return false;
  if (value.confidence !== "high" && value.confidence !== "low") return false;
  if (typeof value.lifecycle !== "string" || !EVENT_LIFECYCLES.has(value.lifecycle)) return false;
  if (typeof value.status !== "string" || !EVENT_STATUSES.has(value.status)) return false;
  if (!Array.isArray(value.splitChildren) || !value.splitChildren.every((id) => typeof id === "string")) return false;
  if (!isCurrentsEventHeatHistory(value.heatHistory)) return false;
  if (!Array.isArray(value.timeline) || !value.timeline.every(isCurrentsEventTimelineEntry)) return false;
  if (!isRecord(value.meta) || typeof value.meta.generatedAt !== "string") return false;
  return true;
}

function isCurrentsEventHeatHistory(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.windowHours !== 24 || value.bucketHours !== 3) return false;
  if (typeof value.windowStart !== "string" || typeof value.windowEnd !== "string") return false;
  const start = Date.parse(value.windowStart);
  const end = Date.parse(value.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start !== 24 * 3600 * 1000) return false;
  if (!Array.isArray(value.points)) return false;

  let previous = Number.NEGATIVE_INFINITY;
  for (const point of value.points) {
    if (!isRecord(point) || typeof point.bucketStart !== "string") return false;
    const time = Date.parse(point.bucketStart);
    if (!Number.isFinite(time) || time <= start || time > end || time <= previous) return false;
    previous = time;
    for (const key of [
      "heat",
      "reportHeat",
      "communityHeat",
      "independentReportCount",
      "communityScoreMax",
    ]) {
      if (typeof point[key] !== "number" || !Number.isFinite(point[key] as number) || (point[key] as number) < 0) {
        return false;
      }
    }
  }
  return true;
}

function isCurrentsEventTimelineEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!["itemId", "sourceId", "sourceName", "publishedAt"].every((key) => typeof value[key] === "string")) return false;
  if (!["sourceOrg", "title"].every((key) => isNullableString(value[key]))) return false;
  if (!isNullableHttpUrl(value.url)) return false;
  if (typeof value.sourceRole !== "string" || !EVENT_ROLES.has(value.sourceRole)) return false;
  if (!["isPrimary", "isOfficial", "isRepresentative", "countsAsIndependent"].every(
    (key) => typeof value[key] === "boolean",
  )) return false;
  if (!["communityScore", "communityComments"].every(
    (key) => value[key] === null || (typeof value[key] === "number" && Number.isFinite(value[key] as number)),
  )) return false;
  return true;
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${clientApiBase()}${path}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new CurrentsApiError("network-error", null);
  }
  if (!res.ok) {
    throw new CurrentsApiError(`http-${res.status}`, res.status);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new CurrentsApiError("invalid-json", res.status);
  }
}

export interface FetchItemsParams {
  locale: string;
  view?: "selected" | "all" | "papers";
  category?: string;
  q?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  from?: string;
  to?: string;
  cursor?: string | null;
  limit?: number;
}

export function fetchItems(
  { locale, view, category, q, source, minScore, maxScore, from, to, cursor, limit = 20 }: FetchItemsParams,
  signal?: AbortSignal,
): Promise<CurrentsItemsResponse> {
  const params = new URLSearchParams({ locale, limit: String(limit) });
  // Phase 6: 显式传 view，不再依赖后端默认（修「全部=50+」的 bug）
  if (view) params.set("view", view);
  if (category) params.set("category", category);
  // 契约：q 最少 2 字符，不足时不发搜索参数
  if (q && q.trim().length >= 2) params.set("q", q.trim());
  if (source) params.set("source", source);
  if (minScore != null) params.set("minScore", String(minScore));
  if (maxScore != null) params.set("maxScore", String(maxScore));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (cursor) params.set("cursor", cursor);
  return fetchJson<CurrentsItemsResponse>(`/v1/items?${params.toString()}`, signal);
}

export function fetchItemDetail(
  id: string,
  locale: string,
  signal?: AbortSignal,
): Promise<CurrentsItemDetail> {
  return fetchJson<CurrentsItemDetail>(
    `/v1/items/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,
    signal,
  );
}

export function fetchSources(signal?: AbortSignal): Promise<{ sources: CurrentsSource[] }> {
  return fetchJson<{ sources: CurrentsSource[] }>("/v1/sources", signal);
}

export function fetchStats(signal?: AbortSignal): Promise<CurrentsStats> {
  return fetchJson<CurrentsStats>("/v1/stats", signal);
}

export function fetchHighlights(
  locale: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<CurrentsHighlightsResponse> {
  return fetchJson<CurrentsHighlightsResponse>(
    `/v1/highlights?locale=${encodeURIComponent(locale)}&window=24h&limit=${limit}`,
    signal,
  );
}

export function fetchDailyArchive(
  locale: string,
  limit = 30,
  signal?: AbortSignal,
): Promise<CurrentsDailyArchiveResponse> {
  return fetchJson<CurrentsDailyArchiveResponse>(
    `/v1/dailies?locale=${encodeURIComponent(locale)}&limit=${limit}`,
    signal,
  );
}

export function fetchDailyLatest(locale: string, signal?: AbortSignal): Promise<CurrentsDailyReport> {
  return fetchJson<CurrentsDailyReport>(`/v1/dailies/latest?locale=${encodeURIComponent(locale)}`, signal);
}

export function fetchDailyByDate(
  date: string,
  locale: string,
  signal?: AbortSignal,
): Promise<CurrentsDailyReport> {
  return fetchJson<CurrentsDailyReport>(
    `/v1/dailies/${encodeURIComponent(date)}?locale=${encodeURIComponent(locale)}`,
    signal,
  );
}

/* ──────────────────────── 服务端（ISR 页面用） ──────────────────────── */

/**
 * 服务端详情页数据获取（ISR）。
 * 只有 res.status === 404 返回 null（资源不存在 → notFound()）；
 * 5xx / 429 / 网络失败 / AbortError / 非法 JSON 一律 throw CurrentsServerFetchError，
 * 让路由 error.tsx 进入可重试错误态，绝不伪装成 404 或被 ISR 缓存为 404。
 */
async function serverFetchDetail<T>(
  path: string,
  revalidate = 300,
  validate?: (value: unknown) => value is T,
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${CURRENTS_API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
  } catch (err) {
    throw new CurrentsServerFetchError("network", null, err instanceof Error ? err.message : "network-error");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new CurrentsServerFetchError("http", res.status, `http-${res.status}`);
  let value: unknown;
  try {
    value = await res.json();
  } catch (err) {
    throw new CurrentsServerFetchError("invalid-json", res.status, err instanceof Error ? err.message : "invalid-json");
  }
  if (validate && !validate(value)) {
    throw new CurrentsServerFetchError("contract", res.status, "invalid-response-contract");
  }
  return value as T;
}

/** 非详情页（sources 等辅助数据）：保持宽松 null 语义，失败不致命。 */
async function serverFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${CURRENTS_API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const serverFetchItemDetail = (id: string, locale: string) =>
  serverFetchDetail<CurrentsItemDetail>(`/v1/items/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchSources = () =>
  serverFetch<{ sources: CurrentsSource[] }>("/v1/sources", 3600);

export const serverFetchDailyLatest = (locale: string) =>
  serverFetch<CurrentsDailyReport>(`/v1/dailies/latest?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchDailyByDate = (date: string, locale: string) =>
  serverFetch<CurrentsDailyReport>(`/v1/dailies/${encodeURIComponent(date)}?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchDailyArchive = (locale: string, limit = 30) =>
  serverFetch<CurrentsDailyArchiveResponse>(`/v1/dailies?locale=${encodeURIComponent(locale)}&limit=${limit}`, 300);

export const serverFetchEventDetail = (id: string, locale: string) =>
  serverFetchDetail<CurrentsEventDetail>(
    `/v1/events/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,
    300,
    isCurrentsEventDetail,
  );

export function fetchHot(
  locale: string,
  limit = 20,
  signal?: AbortSignal,
  type: string = "all",
): Promise<CurrentsHotResponse> {
  return fetchJson<CurrentsHotResponse>(
    `/v1/hot?locale=${encodeURIComponent(locale)}&limit=${limit}&type=${encodeURIComponent(type)}`,
    signal,
  );
}

export function fetchTopics(locale: string, signal?: AbortSignal): Promise<CurrentsTopicsResponse> {
  return fetchJson<CurrentsTopicsResponse>(`/v1/topics?locale=${encodeURIComponent(locale)}`, signal);
}

export const FEEDBACK_CATEGORIES = [
  "content_error",
  "translation_issue",
  "broken_link",
  "category_or_score",
  "other",
] as const;
export type CurrentsFeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface SubmitFeedbackParams {
  targetType: "item" | "event";
  targetId: string;
  category: CurrentsFeedbackCategory;
  message?: string;
  locale: "zh" | "en";
  /** honeypot：正常用户永远不填；非空时后端静默丢弃 */
  website?: string;
}

/**
 * POST /v1/feedback —— 阶段 A 反馈提交（后端唯一公开写入端点）。
 * 错误语义：429 限流 / 其他 HTTP 错误 / 网络错误均抛 CurrentsApiError，由 UI 分支展示。
 */
export async function submitFeedback(
  { targetType, targetId, category, message, locale, website }: SubmitFeedbackParams,
  signal?: AbortSignal,
): Promise<{ ok: true; duplicate?: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${clientApiBase()}/v1/feedback`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        category,
        ...(message && message.trim() !== "" ? { message: message.trim() } : {}),
        locale,
        ...(website ? { website } : {}),
      }),
    });
  } catch {
    throw new CurrentsApiError("network-error", null);
  }
  if (!res.ok) throw new CurrentsApiError(`http-${res.status}`, res.status);
  try {
    const body = (await res.json()) as { ok?: boolean; duplicate?: boolean };
    if (body.ok !== true) throw new CurrentsApiError("invalid-json", res.status);
    return { ok: true, ...(body.duplicate ? { duplicate: true } : {}) };
  } catch (err) {
    if (err instanceof CurrentsApiError) throw err;
    throw new CurrentsApiError("invalid-json", res.status);
  }
}

export function fetchTopicItems(
  topicId: string,
  locale: string,
  cursor?: string | null,
  limit = 20,
  signal?: AbortSignal,
): Promise<CurrentsTopicItemsResponse> {
  const params = new URLSearchParams({ locale, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return fetchJson<CurrentsTopicItemsResponse>(
    `/v1/topics/${encodeURIComponent(topicId)}/items?${params.toString()}`,
    signal,
  );
}
