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
import { CurrentsFilters, type CategoryKey } from "./CurrentsFilters";
import { CurrentsTimeline } from "./CurrentsTimeline";
import { CurrentsReader } from "./CurrentsReader";
import { CurrentsSkeleton, CurrentsLoadMoreSkeleton } from "./CurrentsSkeleton";
import { CurrentsError } from "./CurrentsError";

const PAGE_SIZE = 20;

// ---- 列表状态机（reducer：渲染期 reset，effect 内只做异步 dispatch）----
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
      return state.status === "loading" && state.items.length === 0
        ? state
        : initialListState;
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

  // ---- URL 状态（category / q / item）----
  const category = (searchParams.get("category") ?? "all") as CategoryKey;
  const query = searchParams.get("q") ?? "";
  const openItemId = searchParams.get("item");

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favorites = useFavorites();
  const [sources, setSources] = useState<Map<string, CurrentsSource>>(new Map());
  const [list, dispatch] = useReducer(listReducer, initialListState);
  const [retryCount, setRetryCount] = useState(0);

  // 筛选/locale/retry 变化时在渲染期同步重置列表（避免 effect 内 setState 瀑布渲染）
  const filterKey = `${locale}|${category}|${query}|${retryCount}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    dispatch({ type: "reset" });
  }

  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  /** 无限加载在失败一次后暂停自动触发，避免滚动抖动反复打 API */
  const autoLoadPausedRef = useRef(false);

  // ---- URL 同步 ----
  const syncUrl = useCallback(
    (updates: Record<string, string | null>, mode: "push" | "replace" = "replace") => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      const href = (qs ? `${pathname}?${qs}` : pathname) as Parameters<
        typeof router.replace
      >[0];
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // ---- 信源元数据（失败不影响列表）----
  useEffect(() => {
    const controller = new AbortController();
    fetchSources(controller.signal)
      .then(({ sources: list }) => {
        if (!controller.signal.aborted) {
          setSources(new Map(list.map((s) => [s.id, s])));
        }
      })
      .catch(() => {
        /* 信源名缺失时卡片回退显示 sourceId */
      });
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
        category: category === "all" ? undefined : category,
        q: query,
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
  }, [locale, category, query, retryCount]);

  // ---- 加载更多 ----
  const loadMore = useCallback(() => {
    if (
      list.status !== "ok" ||
      list.loadingMore ||
      !list.hasMore ||
      !list.nextCursor
    ) {
      return;
    }
    const cursor = list.nextCursor;
    const seq = ++requestSeqRef.current;
    dispatch({ type: "moreStart" });
    fetchItems({
      locale,
      category: category === "all" ? undefined : category,
      q: query,
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
  }, [list, locale, category, query]);

  // ---- IntersectionObserver 无限加载（纯订阅，不直接 setState）----
  // loadMore 变化时 observer 重建，闭包始终是最新的，无需 ref 桥接
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !autoLoadPausedRef.current) {
          loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ---- 展示数据（收藏过滤是客户端视图，不走 API）----
  const visibleItems = favoritesOnly
    ? list.items.filter((item) => favorites.includes(item.id))
    : list.items;

  const openItem = useCallback(
    (id: string) => syncUrl({ item: id }, "push"),
    [syncUrl],
  );
  const closeItem = useCallback(() => {
    // 优先回退历史（保留 category/q），无历史则直接清 query
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      syncUrl({ item: null }, "replace");
    }
  }, [router, syncUrl]);

  const retryList = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <CurrentsFilters
        category={category}
        onCategoryChange={(c) => syncUrl({ category: c === "all" ? null : c })}
        query={query}
        onQueryChange={(q) => syncUrl({ q: q || null })}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
      />

      <div className="px-6 py-10">
        {/* 初次加载 skeleton */}
        {list.status === "loading" && (
          <>
            <p className="sr-only" role="status">
              {t("loading")}
            </p>
            <CurrentsSkeleton />
          </>
        )}

        {/* 首次加载失败：仅时间线区域报错，页面壳不拖垮 */}
        {list.status === "error" && <CurrentsError onRetry={retryList} />}

        {list.status === "ok" && (
          <>
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  {query
                    ? t("emptySearch")
                    : favoritesOnly
                      ? t("emptyFavorites")
                      : t("empty")}
                </p>
              </div>
            ) : (
              <CurrentsTimeline
                items={visibleItems}
                sources={sources}
                onOpen={openItem}
              />
            )}

            {/* 无限加载 sentinel + load more 兜底（收藏视图下本地分页无意义，隐藏） */}
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

      {/* 阅读层（URL ?item= 驱动，刷新/分享可恢复） */}
      {openItemId && <CurrentsReader itemId={openItemId} onClose={closeItem} />}
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
