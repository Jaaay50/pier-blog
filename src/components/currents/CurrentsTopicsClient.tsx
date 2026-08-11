"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TransitionLink } from "@/components/TransitionLink";
import { fetchTopics } from "@/lib/currents/api";
import type { CurrentsTopicsResponse } from "@/lib/currents/types";
import { CurrentsError } from "./CurrentsError";

export function CurrentsTopicsClient() {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [data, setData] = useState<CurrentsTopicsResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchTopics(locale, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
        setStatus("ok");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [locale, retryCount]);

  return (
    <div className="pb-14">
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
      {status === "ok" && data && (
        <div className="currents-tl-groups">
          {data.groups.map((group) => {
            const topics = data.topics.filter((tp) => tp.group === group.id);
            if (topics.length === 0) return null;
            return (
              <section key={group.id} aria-label={group.name}>
                <h2 className="font-display mb-4 border-b border-[var(--border)] pb-2 text-lg font-semibold tracking-tight">
                  {group.name}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {topics.map((topic) => (
                    <div key={topic.id} className="currents-surface-list rounded-xl p-4">
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <h3 className="font-medium tracking-tight">
                          <TransitionLink
                            href={`/currents/topics/${topic.id}`}
                            className="transition-colors hover:text-[var(--accent)]"
                          >
                            {topic.name}
                          </TransitionLink>
                        </h3>
                        <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
                          {t("topicsCount", { count: topic.count })}
                        </span>
                      </div>
                      <p className="mb-2 text-[11px] text-[var(--accent)]/80">
                        {t("topicsFeaturedCount", { count: topic.featuredCount })}
                      </p>
                      <ul className="space-y-1">
                        {topic.preview.slice(0, 3).map((p) => (
                          <li key={p.id}>
                            <TransitionLink
                              href={`/currents/${p.id}`}
                              className="line-clamp-1 block text-[12px] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                            >
                              {p.title}
                            </TransitionLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
