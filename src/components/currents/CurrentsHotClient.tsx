"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchHot } from "@/lib/currents/api";
import type { CurrentsHotEvent, CurrentsHotStatus, CurrentsHotType } from "@/lib/currents/types";
import { CurrentsError } from "./CurrentsError";

const STATUS_LABEL_KEY: Record<CurrentsHotStatus, string> = {
  new: "hotStatusNew",
  rising: "hotStatusRising",
  peak: "hotStatusPeak",
  cooling: "hotStatusCooling",
  ended: "hotStatusEnded",
  active: "hotStatusActive",
};

/** 生命周期标签色阶：新 = muted，升温/高峰 = accent 递强，降温/已结束 = 回落，观察中 = 最弱 */
const STATUS_CLASS: Record<CurrentsHotStatus, string> = {
  new: "border-[var(--border)] text-[var(--text-muted)]",
  rising: "border-[var(--accent)]/40 text-[var(--accent)]/80",
  peak: "score-badge-high border-[var(--accent)]/60 font-semibold text-[var(--accent)]",
  cooling: "border-[var(--border-hover)] text-[var(--text-secondary)]",
  ended: "border-[var(--border)] text-[var(--text-muted)]",
  active: "border-[var(--border)] text-[var(--text-muted)]",
};

const TYPE_TABS: Array<{ id: CurrentsHotType; labelKey: string }> = [
  { id: "all", labelKey: "hotTypeAll" },
  { id: "news", labelKey: "hotTypeNews" },
  { id: "product", labelKey: "hotTypeProduct" },
  { id: "research", labelKey: "hotTypeResearch" },
];

function HotCard({ event, watching }: { event: CurrentsHotEvent; watching?: boolean }) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const timeLabel = (() => {
    const at = event.latestActivityAt ?? event.publishedAt;
    if (!at) return null;
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  return (
    <div className={`currents-card card-glass card-glass-hover rounded-xl ${watching ? "opacity-80" : ""}`}>
      <div className="currents-card-meta flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[event.status]}`}
          >
            {t(STATUS_LABEL_KEY[event.status])}
          </span>
          <span className="tabular-nums">{t("hotReports", { count: event.independentReportCount })}</span>
          {event.officialReportCount > 0 && (
            <span className="tabular-nums">{t("hotOfficial", { count: event.officialReportCount })}</span>
          )}
          {(event.communityScoreMax > 0 || event.communityCommentsMax > 0) && (
            <span className="tabular-nums">
              {t("hotCommunity", { score: event.communityScoreMax, comments: event.communityCommentsMax })}
            </span>
          )}
          {timeLabel && <span className="tabular-nums opacity-70">{timeLabel}</span>}
        </div>
        {/* 热度值 badge（右上）：报道密度为主、社区为辅，与推荐评分无关 */}
        <span
          className="shrink-0 rounded-full border border-[var(--accent)]/50 px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-[var(--accent)]"
          aria-label={`${t("hotHeat")} ${event.heat}`}
        >
          {event.heat}
        </span>
      </div>

      <Link
        href={`/currents/events/${event.eventId}`}
        className="currents-card-title mb-1.5 block font-semibold leading-snug tracking-tight transition-colors hover:text-[var(--accent)]"
      >
        {event.title ?? t("hotUntitled")}
      </Link>

      {event.progress && (
        <p className="mb-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{event.progress}</p>
      )}
      {event.summary && !watching && (
        <p className="mb-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">{event.summary}</p>
      )}

      {/* 信源名单：点击展开 */}
      {event.sources.length > 0 && (
        <div className="currents-card-footer">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            {t("hotSourcesTitle")}
          </button>
          {expanded && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {event.sources.map((s) => (
                <li
                  key={s.id}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EventList({ events, watching }: { events: CurrentsHotEvent[]; watching?: boolean }) {
  return (
    <ol className="currents-tl-items">
      {events.map((e, idx) => (
        <li key={e.eventId} className="flex items-start gap-3">
          <span className="w-6 shrink-0 pt-4 text-right text-sm font-semibold tabular-nums text-[var(--text-muted)]">
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <HotCard event={e} watching={watching} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CurrentsHotClient() {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [main, setMain] = useState<CurrentsHotEvent[]>([]);
  const [watching, setWatching] = useState<CurrentsHotEvent[]>([]);
  const [type, setType] = useState<CurrentsHotType>("all");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchHot(locale, 30, controller.signal, type)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.schemaVersion !== 2) {
          // 旧后端（schema 1）：数据形状不兼容，显示可恢复错误而不是 undefined
          setStatus("error");
          return;
        }
        setMain(res.items);
        setWatching(res.watching ?? []);
        setStatus("ok");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [locale, type, retryCount]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-14">
      {/* 综合 / 新闻 / 产品发布 / 研究 切换 */}
      <div role="tablist" aria-label={t("hotTypeLabel")} className="mb-6 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={type === tab.id}
            onClick={() => {
              setType(tab.id);
              setStatus("loading");
            }}
            className={`rounded-full border px-3.5 py-1 text-[13px] transition-colors ${
              type === tab.id
                ? "border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/60 hover:text-[var(--accent)]"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

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
      {status === "ok" && (
        <>
          {main.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--text-muted)]">{t("hotEmpty")}</p>
          ) : (
            <EventList events={main} />
          )}
          {watching.length > 0 && (
            <section aria-label={t("hotWatchingTitle")} className="mt-12">
              <h2 className="font-display mb-1 border-b border-[var(--border)] pb-2 text-lg font-semibold tracking-tight">
                {t("hotWatchingTitle")}
              </h2>
              <p className="mb-4 text-[13px] text-[var(--text-muted)]">{t("hotWatchingSubtitle")}</p>
              <EventList events={watching} watching />
            </section>
          )}
        </>
      )}
    </div>
  );
}
