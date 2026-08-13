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
import {
  isModelsDetailResponse,
  isModelsLeaderboardResponse,
  isModelsMetaResponse,
  type ModelsCategory,
  type ModelsDetailResponse,
  type ModelsLeaderboardResponse,
  type ModelsMetaResponse,
  type ModelsView,
} from "./models-types";

export const CURRENTS_API_BASE = process.env.NEXT_PUBLIC_CURRENTS_API_BASE ?? "https://currents-api.ethanpier.com";

/** Local QA can switch to a same-machine fixture without rebuilding the frontend. */
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

/* ──────── 动态参数验证（generateMetadata 与页面取数前统一调用，非法输入不触发上游请求） ──────── */

/** 与后端 /v1 契约一致的资源 ID 白名单（item id / event id）。 */
const CURRENTS_RESOURCE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidCurrentsResourceId(id: string): boolean {
  return CURRENTS_RESOURCE_ID_RE.test(id);
}

/** 日报日期：格式 + 真实日历日期（拒绝 2026-02-30 / 2026-13-01 这类存在性非法值）。 */
export function isValidCurrentsDailyDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
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

async function fetchJson<T>(
  path: string,
  signal?: AbortSignal,
  validator?: (value: unknown) => value is T,
): Promise<T> {
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
  let value: unknown;
  try {
    value = await res.json();
  } catch {
    throw new CurrentsApiError("invalid-json", res.status);
  }
  if (validator && !validator(value)) {
    throw new CurrentsApiError("contract-error", res.status);
  }
  return value as T;
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
/** 服务端取数的明确上限：挂死的后端连接转化为可重试的 network 错误，而不是占住渲染。 */
const SERVER_FETCH_TIMEOUT_MS = 10_000;

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
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    // 超时（TimeoutError/AbortError）与网络失败同为可重试故障，绝不伪装成 404
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

/**
 * 非详情页（sources 等辅助数据）：保持宽松 null 语义，失败不致命。
 * 同样带明确超时：挂死连接快速收敛到 null，而不是长时间占住渲染。
 */
async function serverFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${CURRENTS_API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
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
  serverFetchDetail<CurrentsDailyReport>(`/v1/dailies/latest?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchDailyByDate = (date: string, locale: string) =>
  serverFetchDetail<CurrentsDailyReport>(`/v1/dailies/${encodeURIComponent(date)}?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchDailyArchive = (locale: string, limit = 30) =>
  serverFetch<CurrentsDailyArchiveResponse>(`/v1/dailies?locale=${encodeURIComponent(locale)}&limit=${limit}`, 300);

export const serverFetchEventDetail = (id: string, locale: string) =>
  serverFetchDetail<CurrentsEventDetail>(
    `/v1/events/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`,
    300,
    isCurrentsEventDetail,
  );

/* ──────── 模型榜（/currents/models） ──────── */

export const serverFetchModelDetail = (slug: string) =>
  serverFetchDetail<ModelsDetailResponse>(
    `/v1/models/${encodeURIComponent(slug)}`,
    300,
    isModelsDetailResponse,
  );

export function fetchModelsLeaderboard(
  category: ModelsCategory,
  view: ModelsView,
  signal?: AbortSignal,
): Promise<ModelsLeaderboardResponse> {
  return fetchJson<ModelsLeaderboardResponse>(
    `/v1/models/leaderboard?category=${encodeURIComponent(category)}&view=${encodeURIComponent(view)}`,
    signal,
    (value): value is ModelsLeaderboardResponse => isModelsLeaderboardResponse(value, category, view),
  );
}

export function fetchModelsMeta(signal?: AbortSignal): Promise<ModelsMetaResponse> {
  return fetchJson<ModelsMetaResponse>(`/v1/models/meta`, signal, isModelsMetaResponse);
}

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

/** 全局产品反馈分类（阶段 C）：targetType 固定为 "site"。 */
export const SITE_FEEDBACK_CATEGORIES = [
  "product_bug",
  "feature_request",
  "source_suggestion",
  "agent_access",
  "other",
] as const;
export type SiteFeedbackCategory = (typeof SITE_FEEDBACK_CATEGORIES)[number];

export interface SubmitFeedbackParams {
  targetType: "item" | "event";
  targetId: string;
  category: CurrentsFeedbackCategory;
  message?: string;
  locale: "zh" | "en";
  /** honeypot：正常用户永远不填；非空时后端静默丢弃 */
  website?: string;
}

export interface SubmitSiteFeedbackParams {
  category: SiteFeedbackCategory;
  /** 全局反馈必填（无内容上下文的空反馈没有可执行性） */
  message: string;
  locale: "zh" | "en";
  /** 反馈入口所在页面路径；已清洗（仅路径，无 query/hash/凭据）。仅作分流上下文。 */
  pagePath?: string;
  /** honeypot：正常用户永远不填；非空时后端静默丢弃 */
  website?: string;
}

/**
 * 反馈来源路径清洗：只保留 pathname，剥掉 query、hash 与任何潜在敏感参数。
 * 非站内绝对路径（含协议/反斜杠/空白）一律丢弃，返回 undefined。
 */
export function sanitizeFeedbackPagePath(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  let path = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      path = url.pathname;
    }
  } catch {
    return undefined;
  }
  // 裸路径形式：手动剥掉 query 与 hash
  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  if (!path.startsWith("/") || path.includes("\\") || /\s/.test(path)) return undefined;
  if (path.length > 200) path = path.slice(0, 200);
  return path;
}

/**
 * POST /v1/feedback —— 阶段 C 全局产品反馈（targetType "site"）。
 * 与内容纠错共用同一端点与防护层（限流/幂等/容量/honeypot），错误语义一致。
 */
export async function submitSiteFeedback(
  { category, message, locale, pagePath, website }: SubmitSiteFeedbackParams,
  signal?: AbortSignal,
): Promise<{ ok: true; duplicate?: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${clientApiBase()}/v1/feedback`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        targetType: "site",
        category,
        message: message.trim(),
        locale,
        ...(pagePath ? { pagePath } : {}),
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
