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
 * 标准资讯行（Phase 6 紧凑态）：整卡为真实 <Link>，原生新标签/中键可用。
 * 信息层级：来源+时间 → 精选 → 评分+收藏 → 标题 → 摘要2行 → 多信源 → 推荐理由 → 标签≤2
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
      className="card-glass card-glass-hover group block rounded-xl px-4 py-3.5"
    >
      {/* 顶行：来源 + 精选 badge / 评分 + 收藏 */}
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--text-muted)]">
          {timeLabel && <span className="tabular-nums">{timeLabel}</span>}
          {sourceName && (
            <>
              <span className="opacity-40">·</span>
              <span className="truncate font-medium text-[var(--text-secondary)]">{sourceName}</span>
            </>
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

      {/* 标题（已读弱化；高分加字重） */}
      <h3
        className={`mb-1 text-[15px] leading-snug tracking-tight ${
          highScore ? "font-semibold" : "font-medium"
        } ${isRead ? "text-[var(--text-muted)]" : ""}`}
      >
        {item.title}
      </h3>

      {/* 摘要（2 行） */}
      {item.summary && (
        <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {item.summary}
        </p>
      )}

      {/* 推荐理由（默认 1 行）+ 标签≤2 */}
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        {item.reason && <p className="line-clamp-1 min-w-0 flex-1">{item.reason}</p>}
        {item.tags && item.tags.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        )}
        {multiSourceCount != null && multiSourceCount > 1 && (
          <span className="shrink-0">{t("sourcesCount", { count: multiSourceCount })}</span>
        )}
      </div>
    </Link>
  );
}
