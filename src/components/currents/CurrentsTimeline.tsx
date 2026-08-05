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

/** 时间线：按日期分组（日期 + 星期 + 条数），左轨 + accent 节点，分组头吸顶可折叠 */
export function CurrentsTimeline({ items, sources }: CurrentsTimelineProps) {
  const locale = useLocale();
  const t = useTranslations("currents");
  const groups = groupByDay(items, locale);

  return (
    <div className="space-y-10">
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
            {/* 日期分组头（吸顶 + 可折叠） */}
            <header className="sticky top-[65px] z-10 mb-4 flex items-baseline gap-2 bg-[var(--bg-primary)]/80 py-1.5 backdrop-blur-sm">
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

            {/* 时间轴：var(--border) 轨道 + var(--accent) 节点，紧凑间距 */}
            <div className="relative space-y-2.5 border-l border-[var(--border)] pl-4 sm:pl-5">
              {group.items.map((item) => (
                <div key={item.id} className="relative">
                  {/* 节点 */}
                  <span
                    aria-hidden
                    className="absolute -left-4 top-5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)] sm:-left-5"
                    style={{ transform: "translateX(calc(-50% - 0.5px))" }}
                  />
                  <CurrentsCard
                    item={item}
                    sourceName={sourceNameFor(item, sources, locale)}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
