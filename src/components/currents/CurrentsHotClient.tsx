"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchHot } from "@/lib/currents/api";
import type { CurrentsHotEvent, CurrentsHotStatus } from "@/lib/currents/types";
import { CurrentsError } from "./CurrentsError";

const STATUS_LABEL_KEY: Record<CurrentsHotStatus, string> = {
  new: "hotStatusNew",
  brewing: "hotStatusBrewing",
  hot: "hotStatusHot",
};

/** 状态标签色阶：新 = muted，发酵中 = 半 accent，爆 = 全 accent + 柔光 */
const STATUS_CLASS: Record<CurrentsHotStatus, string> = {
  new: "border-[var(--border)] text-[var(--text-muted)]",
  brewing: "border-[var(--accent)]/40 text-[var(--accent)]/80",
  hot: "score-badge-high border-[var(--accent)]/60 font-semibold text-[var(--accent)]",
};

function HotCard({ event }: { event: CurrentsHotEvent }) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const timeLabel = (() => {
    if (!event.publishedAt) return null;
    const d = new Date(event.publishedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  return (
    <div className="currents-card card-glass card-glass-hover rounded-xl">
      <div className="currents-card-meta flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[event.status]}`}
          >
            {t(STATUS_LABEL_KEY[event.status])}
          </span>
          <span className="tabular-nums">{t("hotSources", { count: event.sourceCount })}</span>
          {timeLabel && <span className="tabular-nums opacity-70">{timeLabel}</span>}
        </div>
        {/* 热度值 badge（右上） */}
        <span
          className="shrink-0 rounded-full border border-[var(--accent)]/50 px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-[var(--accent)]"
          aria-label={`${t("hotHeat")} ${event.heat}`}
        >
          {event.heat}
        </span>
      </div>

      {event.itemId ? (
        <Link
          href={`/currents/${event.itemId}`}
          className="currents-card-title mb-1.5 block font-semibold leading-snug tracking-tight transition-colors hover:text-[var(--accent)]"
        >
          {event.title}
        </Link>
      ) : (
        <h3 className="currents-card-title mb-1.5 font-semibold leading-snug tracking-tight">
          {event.title}
        </h3>
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

export function CurrentsHotClient() {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [events, setEvents] = useState<CurrentsHotEvent[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchHot(locale, 30, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setEvents(res.items);
        setStatus("ok");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [locale, retryCount]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-14">
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
        (events.length === 0 ? (
          <p className="py-20 text-center text-sm text-[var(--text-muted)]">{t("hotEmpty")}</p>
        ) : (
          <ol className="currents-tl-items">
            {events.map((e, idx) => (
              <li key={e.eventId} className="flex items-start gap-3">
                <span className="w-6 shrink-0 pt-4 text-right text-sm font-semibold tabular-nums text-[var(--text-muted)]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <HotCard event={e} />
                </div>
              </li>
            ))}
          </ol>
        ))}
    </div>
  );
}
