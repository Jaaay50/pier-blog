"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CurrentsListItem } from "@/lib/currents/types";
import { ScoreBadge } from "./ScoreBadge";
import { FavoriteButton } from "./FavoriteButton";

interface CurrentsCardProps {
  item: CurrentsListItem;
  sourceName: string | null;
  onOpen: (id: string) => void;
}

/**
 * 卡片信息层级（方案 13.6）：
 * 来源+类型 → 精选 badge → 评分（右上）→ 收藏 → 标题 → 摘要 → 多信源数
 * → 分隔线 → 推荐理由 → 标签
 */
export function CurrentsCard({ item, sourceName, onOpen }: CurrentsCardProps) {
  const t = useTranslations("currents");
  const locale = useLocale();

  const multiSourceCount =
    item.sourceCount ?? item.reportedByCount ?? null;

  const timeLabel = (() => {
    if (!item.publishedAt) return null;
    const d = new Date(item.publishedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={item.title}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item.id);
        }
      }}
      className="card-glass card-glass-hover group flex cursor-pointer flex-col rounded-xl p-5"
    >
      {/* 顶行：来源 + 精选 badge / 评分 + 收藏 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-muted)]">
          {sourceName && (
            <span className="truncate font-medium text-[var(--text-secondary)]">
              {sourceName}
            </span>
          )}
          {item.author && (
            <>
              <span className="opacity-40">·</span>
              <span className="truncate">{item.author}</span>
            </>
          )}
          {item.isFeatured && (
            <span className="rounded-full border border-[var(--accent)]/50 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
              {t("featured")}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ScoreBadge score={item.score} />
          <FavoriteButton itemId={item.id} />
        </div>
      </div>

      {/* 标题 */}
      <h3 className="mb-2 text-base font-semibold leading-snug tracking-tight">
        {item.title}
      </h3>

      {/* 摘要 */}
      {item.summary && (
        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {item.summary}
        </p>
      )}

      {/* 多信源数量（字段缺失时整行隐藏） */}
      {multiSourceCount != null && multiSourceCount > 1 && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {t("sourcesCount", { count: multiSourceCount })}
        </p>
      )}

      {/* 分隔线 + 推荐理由 + 标签 */}
      {(item.reason || (item.tags && item.tags.length > 0)) && (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          {item.reason && (
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-secondary)]">
                {t("recommendedReason")}：
              </span>
              {item.reason}
            </p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 时间（右下角，时间轴 dot 之外的时间精度） */}
      {timeLabel && (
        <div className="mt-3 text-right text-[11px] text-[var(--text-muted)] opacity-70">
          {timeLabel}
        </div>
      )}
    </article>
  );
}
