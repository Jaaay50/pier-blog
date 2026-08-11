"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CurrentsListItem, CurrentsSource } from "@/lib/currents/types";
import { CurrentsCard } from "./CurrentsCard";

interface CurrentsTimelineProps {
  items: CurrentsListItem[];
  sources: Map<string, CurrentsSource>;
}

interface DayGroup {
  key: string;
  date: Date;
  items: CurrentsListItem[];
}

function groupByDay(items: CurrentsListItem[], locale: string): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const item of items) {
    const d = item.publishedAt ? new Date(item.publishedAt) : null;
    const valid = d && !Number.isNaN(d.getTime());
    // 缺失日期归入「未知日期」组，key 用特殊值
    const key = valid
      ? d!.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "unknown";
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { key, date: valid ? d! : new Date(0), items: [item] });
    }
  }
  return [...groups.values()];
}

function sourceNameFor(
  item: CurrentsListItem,
  sources: Map<string, CurrentsSource>,
  locale: string,
): string | null {
  if (!item.sourceId) return null;
  const s = sources.get(item.sourceId);
  if (!s) return item.sourceId;
  return locale === "zh" ? (s.nameZh ?? s.name) : s.name;
}

function timeLabelFor(item: CurrentsListItem, locale: string): string | null {
  if (!item.publishedAt) return null;
  const d = new Date(item.publishedAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 时间线：日期分组头融入内容流；桌面端时间在轨道左侧独立成列，节点加大 */
export function CurrentsTimeline({ items, sources }: CurrentsTimelineProps) {
  const locale = useLocale();
  const t = useTranslations("currents");
  const groups = groupByDay(items, locale);

  return (
    <div className="currents-tl-groups">
      {groups.map((group) => {
        const isUnknown = group.key === "unknown";
        const dateLabel = isUnknown
          ? t("unknownDate")
          : group.date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
              month: "long",
              day: "numeric",
            });
        const weekdayLabel = isUnknown
          ? null
          : group.date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
              weekday: "long",
            });

        return (
          <section key={group.key} aria-label={dateLabel}>
            {/* 日期标题保持在内容流中，直接融入页面背景，避免与筛选栏叠层。 */}
            <header className="mb-4 flex items-baseline gap-2 border-b border-[var(--border)] py-2">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {dateLabel}
              </h2>
              {weekdayLabel && (
                <span className="text-sm text-[var(--text-muted)]">{weekdayLabel}</span>
              )}
              <span className="text-xs text-[var(--text-muted)] opacity-70">
                {t("itemsCount", { count: group.items.length })}
              </span>
            </header>

            {/* 时间轴：var(--border) 轨道 + 加大 accent 节点，桌面端时间在左侧独立成列 */}
            <div className="currents-tl-items relative border-l border-[var(--border)] pl-4 sm:pl-5">
              {group.items.map((item) => {
                const timeLabel = timeLabelFor(item, locale);
                return (
                  <div key={item.id} className="relative">
                    {/* 节点 */}
                    <span
                      aria-hidden
                      className="currents-tl-node absolute -left-4 top-6 -translate-x-1/2 sm:-left-5"
                      style={{ transform: "translateX(calc(-50% - 0.5px))" }}
                    />
                    <div className="currents-tl-row">
                      {timeLabel && (
                        <time dateTime={item.publishedAt!} className="currents-tl-time tabular-nums">
                          {timeLabel}
                        </time>
                      )}
                      <div className="min-w-0 flex-1">
                        <CurrentsCard
                          item={item}
                          sourceName={sourceNameFor(item, sources, locale)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
