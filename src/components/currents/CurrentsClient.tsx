"use client";

import { Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchItems, fetchSources } from "@/lib/currents/api";
import type {
  CurrentsItemsResponse,
  CurrentsListItem,
  CurrentsSource,
} from "@/lib/currents/types";
import { useFavorites } from "@/lib/currents/useFavorites";
import { useDensity } from "@/lib/currents/useDensity";
import { CurrentsFilters, type CategoryKey, type ViewKey } from "./CurrentsFilters";
import { CurrentsTimeline } from "./CurrentsTimeline";
import { CurrentsHighlights } from "./CurrentsHighlights";
import { CurrentsSkeleton, CurrentsLoadMoreSkeleton } from "./CurrentsSkeleton";
import { CurrentsError } from "./CurrentsError";

const PAGE_SIZE = 20;

interface ListState {
  status: "loading" | "ok" | "error";
  items: CurrentsListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
}

const initialListState: ListState = {
  status: "loading",
  items: [],
  nextCursor: null,
  hasMore: false,
  loadingMore: false,
  loadMoreError: false,
};

type ListAction =
  | { type: "reset" }
  | { type: "firstOk"; res: CurrentsItemsResponse }
  | { type: "firstError" }
  | { type: "moreStart" }
  | { type: "moreOk"; res: CurrentsItemsResponse }
  | { type: "moreError" };

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case "reset":
      return state.status === "loading" && state.items.length === 0 ? state : initialListState;
    case "firstOk":
      return {
        status: "ok",
        items: action.res.items,
        nextCursor: action.res.nextCursor,
        hasMore: action.res.hasMore,
        loadingMore: false,
        loadMoreError: false,
      };
    case "firstError":
      return { ...initialListState, status: "error" };
    case "moreStart":
      return { ...state, loadingMore: true, loadMoreError: false };
    case "moreOk":
      return {
        ...state,
        items: [...state.items, ...action.res.items],
        nextCursor: action.res.nextCursor,
        hasMore: action.res.hasMore,
        loadingMore: false,
      };
    case "moreError":
      return { ...state, loadingMore: false, loadMoreError: true };
  }
}

function CurrentsClientInner() {
  const t = useTranslations("currents");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- URL 状态 ----
  const view = (searchParams.get("view") ?? "selected") as ViewKey;
  const category = (searchParams.get("category") ?? "all") as CategoryKey;
  const query = searchParams.get("q") ?? "";
  const source = searchParams.get("source") ?? "";
  const minScore = searchParams.get("minScore") ?? "";
  const legacyItemId = searchParams.get("item"); // 旧链接 ?item= 兼容

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favorites = useFavorites();
  const density = useDensity();
  const [sources, setSources] = useState<CurrentsSource[]>([]);
  const [sourceMap, setSourceMap] = useState<Map<string, CurrentsSource>>(new Map());
  const [list, dispatch] = useReducer(listReducer, initialListState);
  const [retryCount, setRetryCount] = useState(0);

  // 旧链接兼容：/currents?item=<id> → /currents/<id>（客户端兜底，首帧执行）
  useEffect(() => {
    if (legacyItemId) {
      router.replace(`/currents/${legacyItemId}`);
    }
  }, [legacyItemId, router]);

  const filterKey = `${locale}|${view}|${category}|${query}|${source}|${minScore}|${retryCount}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    dispatch({ type: "reset" });
  }

  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const autoLoadPausedRef = useRef(false);

  const syncUrl = useCallback(
    (updates: Record<string, string | null>, mode: "push" | "replace" = "replace") => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      const href = (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0];
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // ---- 信源元数据 ----
  useEffect(() => {
    const controller = new AbortController();
    fetchSources(controller.signal)
      .then(({ sources: list }) => {
        if (!controller.signal.aborted) {
          const enabled = list.filter((s) => s.enabled !== false);
          setSources(enabled);
          setSourceMap(new Map(enabled.map((s) => [s.id, s])));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // ---- 首屏 / 筛选变化加载 ----
  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const controller = new AbortController();
    autoLoadPausedRef.current = false;

    fetchItems(
      {
        locale,
        view,
        category: view === "papers" || category === "all" ? undefined : category,
        q: query,
        source: source || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        limit: PAGE_SIZE,
      },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted || seq !== requestSeqRef.current) return;
        dispatch({ type: "firstOk", res });
      })
      .catch((err) => {
        if (controller.signal.aborted || seq !== requestSeqRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch({ type: "firstError" });
      });

    return () => controller.abort();
  }, [locale, view, category, query, source, minScore, retryCount]);

  // ---- 加载更多 ----
  const loadMore = useCallback(() => {
    if (list.status !== "ok" || list.loadingMore || !list.hasMore || !list.nextCursor) return;
    const cursor = list.nextCursor;
    const seq = ++requestSeqRef.current;
    dispatch({ type: "moreStart" });
    fetchItems({
      locale,
      view,
      category: view === "papers" || category === "all" ? undefined : category,
      q: query,
      source: source || undefined,
      minScore: minScore ? Number(minScore) : undefined,
      cursor,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        dispatch({ type: "moreOk", res });
      })
      .catch(() => {
        if (seq !== requestSeqRef.current) return;
        autoLoadPausedRef.current = true;
        dispatch({ type: "moreError" });
      });
  }, [list, locale, view, category, query, source, minScore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !autoLoadPausedRef.current) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const visibleItems = favoritesOnly
    ? list.items.filter((item) => favorites.includes(item.id))
    : list.items;

  const retryList = useCallback(() => setRetryCount((c) => c + 1), []);

  return (
    <div className="mx-auto max-w-6xl">
      {/* 今日要闻（仅精选视图顶部） */}
      {view === "selected" && !query && (
        <CurrentsHighlights locale={locale} sourceMap={sourceMap} />
      )}

      <CurrentsFilters
        view={view}
        onViewChange={(v) => syncUrl({ view: v === "selected" ? null : v, category: null })}
        category={category}
        onCategoryChange={(c) => syncUrl({ category: c === "all" ? null : c })}
        query={query}
        onQueryChange={(q) => syncUrl({ q: q || null })}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        sources={sources}
        source={source}
        onSourceChange={(s) => syncUrl({ source: s || null })}
        minScore={minScore}
        onMinScoreChange={(v) => syncUrl({ minScore: v || null })}
        density={density}
      />

      <div className="px-6 py-8">
        {list.status === "loading" && (
          <>
            <p className="sr-only" role="status">{t("loading")}</p>
            <CurrentsSkeleton />
          </>
        )}
        {list.status === "error" && <CurrentsError onRetry={retryList} />}

        {list.status === "ok" && (
          <>
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  {query ? t("emptySearch") : favoritesOnly ? t("emptyFavorites") : t("empty")}
                </p>
              </div>
            ) : (
              <CurrentsTimeline items={visibleItems} sources={sourceMap} />
            )}

            {!favoritesOnly && list.hasMore && (
              <div className="mt-10">
                {list.loadingMore && <CurrentsLoadMoreSkeleton />}
                {list.loadMoreError && (
                  <CurrentsError
                    inline
                    onRetry={() => {
                      autoLoadPausedRef.current = false;
                      loadMore();
                    }}
                  />
                )}
                {!list.loadingMore && !list.loadMoreError && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      className="rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                    >
                      {t("loadMore")}
                    </button>
                  </div>
                )}
                <div ref={sentinelRef} aria-hidden className="h-1" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** useSearchParams 需要 Suspense 边界以保持页面 SSG */
export function CurrentsClient() {
  return (
    <Suspense fallback={<div className="px-6 py-10"><CurrentsSkeleton /></div>}>
      <CurrentsClientInner />
    </Suspense>
  );
}
