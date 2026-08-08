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

/** Server-side fetch with ISR revalidate (used by /currents/[id] and /currents/daily*). */
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
  serverFetch<CurrentsItemDetail>(`/v1/items/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchSources = () =>
  serverFetch<{ sources: CurrentsSource[] }>("/v1/sources", 3600);

export const serverFetchDailyLatest = (locale: string) =>
  serverFetch<CurrentsDailyReport>(`/v1/dailies/latest?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchDailyByDate = (date: string, locale: string) =>
  serverFetch<CurrentsDailyReport>(`/v1/dailies/${encodeURIComponent(date)}?locale=${encodeURIComponent(locale)}`, 300);

export const serverFetchDailyArchive = (locale: string, limit = 30) =>
  serverFetch<CurrentsDailyArchiveResponse>(`/v1/dailies?locale=${encodeURIComponent(locale)}&limit=${limit}`, 300);

export const serverFetchEventDetail = (id: string, locale: string) =>
  serverFetch<CurrentsEventDetail>(`/v1/events/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`, 300);

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
