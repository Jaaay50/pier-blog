/**
 * Currents 只读 API 客户端。
 * 仅在客户端组件中调用（"use client" 数据岛），页面壳保持 SSG。
 */
import type {
  CurrentsItemDetail,
  CurrentsItemsResponse,
  CurrentsSource,
} from "./types";

export const CURRENTS_API_BASE = "https://currents-api.ethanpier.com";

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
    res = await fetch(`${CURRENTS_API_BASE}${path}`, {
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
  category?: string;
  q?: string;
  cursor?: string | null;
  limit?: number;
}

export function fetchItems(
  { locale, category, q, cursor, limit = 20 }: FetchItemsParams,
  signal?: AbortSignal,
): Promise<CurrentsItemsResponse> {
  const params = new URLSearchParams({ locale, limit: String(limit) });
  if (category) params.set("category", category);
  // 契约：q 最少 2 字符，不足时不发搜索参数
  if (q && q.trim().length >= 2) params.set("q", q.trim());
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
