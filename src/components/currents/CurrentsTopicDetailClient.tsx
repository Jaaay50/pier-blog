"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchSources, fetchTopicItems } from "@/lib/currents/api";
import type { CurrentsListItem, CurrentsSource } from "@/lib/currents/types";
import { CurrentsTimeline } from "./CurrentsTimeline";
import { CurrentsError } from "./CurrentsError";

const PAGE_SIZE = 20;

interface TopicMeta {
  id: string;
  group: string;
  name: string;
}

/** 主题详情：后端 /v1/topics/:id/items 游标分页 + 复用时间线（卡片/已读/密度体验一致） */
export function CurrentsTopicDetailClient({ topicId }: { topicId: string }) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "notfound">("loading");
  const [topic, setTopic] = useState<TopicMeta | null>(null);
  const [items, setItems] = useState<CurrentsListItem[]>([]);
  const [sourceMap, setSourceMap] = useState<Map<string, CurrentsSource>>(new Map());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const seq = ++requestSeqRef.current;
    const controller = new AbortController();

    (async () => {
      const sourcesPromise = fetchSources(controller.signal).catch(() => ({ sources: [] as CurrentsSource[] }));
      let res;
      try {
        res = await fetchTopicItems(topicId, locale, null, PAGE_SIZE, controller.signal);
      } catch (err) {
        if (controller.signal.aborted || seq !== requestSeqRef.current) return;
        setStatus(err instanceof Error && err.message === "http-404" ? "notfound" : "error");
        return;
      }
      const { sources } = await sourcesPromise;
      if (controller.signal.aborted || seq !== requestSeqRef.current) return;
      setSourceMap(new Map(sources.filter((s) => s.enabled !== false).map((s) => [s.id, s])));
      setTopic(res.topic);
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setStatus("ok");
    })();

    return () => controller.abort();
  }, [locale, topicId, retryCount]);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMore) return;
    const seq = ++requestSeqRef.current;
    setLoadingMore(true);
    fetchTopicItems(topicId, locale, nextCursor, PAGE_SIZE)
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
        });
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
        setLoadingMore(false);
      })
      .catch(() => {
        if (seq === requestSeqRef.current) setLoadingMore(false);
      });
  }, [hasMore, nextCursor, loadingMore, topicId, locale]);

  return (
    <div className="pb-14">
      <div className="mb-6">
        <Link
          href="/currents/topics"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToTopics")}
        </Link>
      </div>

      {topic && (
        <header className="pb-8">
          <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {topic.name}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {t("topicDetailSubtitle", { name: topic.name })}
          </p>
        </header>
      )}

      {status === "loading" && (
        <p className="py-20 text-center text-sm text-[var(--text-muted)]" role="status">
          {t("loading")}
        </p>
      )}
      {status === "error" && (
        <div className="py-10">
          <CurrentsError onRetry={() => setRetryCount((c) => c + 1)} />
        </div>
      )}
      {status === "notfound" && (
        <p className="py-20 text-center text-sm text-[var(--text-muted)]">{t("topicsEmpty")}</p>
      )}
      {status === "ok" && (
        <>
          {items.length === 0 ? (
            <p className="py-20 text-center text-sm text-[var(--text-muted)]">{t("topicsEmpty")}</p>
          ) : (
            <CurrentsTimeline items={items} sources={sourceMap} />
          )}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {loadingMore ? t("loading") : t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
