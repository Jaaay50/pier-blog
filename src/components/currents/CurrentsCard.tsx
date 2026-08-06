"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CurrentsListItem } from "@/lib/currents/types";
import { ScoreBadge } from "./ScoreBadge";
import { FavoriteButton } from "./FavoriteButton";
import { useIsRead } from "@/lib/currents/useReadState";

interface CurrentsCardProps {
  item: CurrentsListItem;
  sourceName: string | null;
}

/**
 * 资讯卡片：整卡为真实 <Link>，原生新标签/中键可用。
 * 密度变量（--currents-*）驱动留白/字号/摘要行数；桌面端时间在时间轴左侧独立成列，
 * 卡内时间仅移动端显示（sm:hidden）。标准/宽松档已读整卡弱化并收起摘要。
 */
export function CurrentsCard({ item, sourceName }: CurrentsCardProps) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const isRead = useIsRead(item.id);

  const multiSourceCount = item.sourceCount ?? item.reportedByCount ?? null;

  const timeLabel = (() => {
    if (!item.publishedAt) return null;
    const d = new Date(item.publishedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  const highScore = (item.score ?? 0) >= 80;

  return (
    <Link
      href={`/currents/${item.id}`}
      aria-label={item.title}
      className={`currents-card card-glass card-glass-hover group block rounded-xl ${
        isRead ? "currents-card-read" : ""
      }`}
    >
      {/* 顶行：来源 + badge / 评分 + 收藏 */}
      <div className="currents-card-meta flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--text-muted)]">
          {sourceName && (
            <span className="truncate font-medium text-[var(--text-secondary)]">{sourceName}</span>
          )}
          {timeLabel && (
            <span className="tabular-nums sm:hidden">
              {sourceName && <span className="opacity-40">· </span>}
              {timeLabel}
            </span>
          )}
          {isRead && (
            <span className="rounded-full border border-[var(--border)] px-1.5 text-[10px] opacity-70">
              {t("read")}
            </span>
          )}
          {item.isFeatured && (
            <span className="rounded-full border border-[var(--accent)]/50 px-1.5 text-[10px] font-medium text-[var(--accent)]">
              {t("featured")}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ScoreBadge score={item.score} />
          <span
            role="presentation"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FavoriteButton itemId={item.id} />
          </span>
        </div>
      </div>

      {/* 标题与摘要成组，间距与下方推荐理由拉开（高分标题加字重） */}
      <div className="currents-card-summary-block">
        <h3
          className={`currents-card-title mb-1.5 leading-snug tracking-tight ${
            highScore ? "font-semibold" : "font-medium"
          } ${isRead ? "text-[var(--text-muted)]" : ""}`}
        >
          {item.title}
        </h3>
        {item.summary && (
          <p className="currents-card-summary text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {item.summary}
          </p>
        )}
      </div>

      {/* 推荐理由：单独成行 + accent 左引导条 */}
      {item.reason && (
        <p className="currents-card-reason line-clamp-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
          {item.reason}
        </p>
      )}

      {/* 底行：标签左 / 多信源计数右，各自归位 */}
      {((item.tags && item.tags.length > 0) || (multiSourceCount != null && multiSourceCount > 1)) && (
        <div className="currents-card-footer flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
          <div className="flex min-w-0 flex-wrap gap-1">
            {item.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 text-[10px]">
                {tag}
              </span>
            ))}
          </div>
          {multiSourceCount != null && multiSourceCount > 1 && (
            <span className="shrink-0 tabular-nums">{t("sourcesCount", { count: multiSourceCount })}</span>
          )}
        </div>
      )}
    </Link>
  );
}
