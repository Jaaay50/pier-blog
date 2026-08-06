"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchItems, fetchSources, fetchTopics } from "@/lib/currents/api";
import type {
  CurrentsListItem,
  CurrentsSource,
  CurrentsTopic,
} from "@/lib/currents/types";
import { CurrentsTimeline } from "./CurrentsTimeline";
import { CurrentsError } from "./CurrentsError";

const PAGE_SIZE = 50;

/**
 * 主题详情：后端 /v1/items?topic= 尚未实现（批次 2 阶段二），
 * 先按主题规则的 tags 在前端过滤（拉全部视图分页，客户端交集）。
 */
export function CurrentsTopicDetailClient({ topicId }: { topicId: string }) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [topic, setTopic] = useState<CurrentsTopic | null>(null);
  const [items, setItems] = useState<CurrentsListItem[]>([]);
  const [sourceMap, setSourceMap] = useState<Map<string, CurrentsSource>>(new Map());
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      // 1) 主题定义（tags 匹配规则）来自 /v1/topics 响应 preview 不可直接得 tags，
      //    前端按主题 id → tag 名映射：topics API 的 preview 条目带 tags，改走 items 过滤。
      const topicsRes = await fetchTopics(locale, controller.signal);
      const found = topicsRes.topics.find((tp) => tp.id === topicId) ?? null;
      if (controller.signal.aborted) return;
      setTopic(found);

      // 2) 信源映射（时间线显示来源名）
      const { sources } = await fetchSources(controller.signal);
      if (controller.signal.aborted) return;
      setSourceMap(new Map(sources.filter((s) => s.enabled !== false).map((s) => [s.id, s])));

      // 3) 拉全部视图条目，按 preview 条目 id 集合 + 主题名 tag 双重匹配
      const previewIds = new Set((found?.preview ?? []).map((p) => p.id));
      const topicName = found?.name ?? "";
      const collected: CurrentsListItem[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 8; page++) {
        const res = await fetchItems(
          { locale, view: "all", limit: PAGE_SIZE, cursor },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        for (const item of res.items) {
          if (previewIds.has(item.id)) {
            collected.push(item);
            continue;
          }
          const tags = item.tags ?? [];
          if (
            tags.some(
              (tag) =>
                topicName.toLowerCase().includes(tag.toLowerCase()) ||
                tag.toLowerCase().includes(topicName.toLowerCase()),
            )
          ) {
            collected.push(item);
          }
        }
        if (!res.hasMore || !res.nextCursor) break;
        cursor = res.nextCursor;
      }
      // 去重 + 按时间排序
      const seen = new Set<string>();
      const unique = collected.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
      unique.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
      setItems(unique);
      setStatus("ok");
    })().catch(() => {
      if (!controller.signal.aborted) setStatus("error");
    });

    return () => controller.abort();
  }, [locale, topicId, retryCount]);

  const header = useMemo(() => topic?.name ?? topicId, [topic, topicId]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-14">
      <header className="pb-8">
        <h1 className="font-display mb-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {header}
        </h1>
        <p className="text-[var(--text-secondary)]">
          {t("topicDetailSubtitle", { name: header })}
        </p>
      </header>

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
      {status === "ok" &&
        (items.length === 0 ? (
          <p className="py-20 text-center text-sm text-[var(--text-muted)]">{t("topicsEmpty")}</p>
        ) : (
          <CurrentsTimeline items={items} sources={sourceMap} />
        ))}
    </div>
  );
}
