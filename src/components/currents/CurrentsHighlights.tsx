"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TransitionLink } from "@/components/TransitionLink";
import { fetchHighlights, fetchStats } from "@/lib/currents/api";
import type { CurrentsHighlightCard, CurrentsSource, CurrentsStats } from "@/lib/currents/types";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  locale: string;
  sourceMap: Map<string, CurrentsSource>;
}

/**
 * 今日要闻：1 个主故事 + 最多 4 个次要卡。
 * 按主内容容器宽度（container query，非视口）响应：
 * - 宽容器（≥1100px 内容宽）：主故事 7/12 + 右侧 2×2 次要卡
 * - 中容器（≥720px）：主故事独占一行，次要卡下方 2×2
 * - 窄容器：单列
 * 主卡与次要卡均按内容高度排版（无 grid stretch 强制同高），
 * 数据不足自然缩减，不保留空槽。
 */
export function CurrentsHighlights({ locale, sourceMap }: Props) {
  const t = useTranslations("currents");
  const [lead, setLead] = useState<CurrentsHighlightCard | null>(null);
  const [items, setItems] = useState<CurrentsHighlightCard[]>([]);
  const [stats, setStats] = useState<CurrentsStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchHighlights(locale, 5)
      .then((res) => {
        if (!alive) return;
        setLead(res.lead);
        setItems(res.items ?? []);
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    fetchStats().then(setStats).catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale]);

  const nameOf = (id: string | null) => {
    if (!id) return null;
    const s = sourceMap.get(id);
    return s ? (locale === "zh" ? (s.nameZh ?? s.name) : s.name) : id;
  };

  return (
    <div className="pt-8">
      <div>
        {/* 状态条 */}
        {stats && (
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            {t("statusBar", {
              total: stats.publishedItems,
              updated: stats.lastSuccessfulRunAt
                ? new Date(stats.lastSuccessfulRunAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "—",
              sources: sourceMap.size || "—",
            })}
            {" · "}
            <TransitionLink href="/currents/daily" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
              {t("viewDaily")} →
            </TransitionLink>
          </p>
        )}

        {loaded && lead && (
          <section aria-label={t("highlightsTitle")} className="mb-8">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {t("highlightsTitle")}
            </h2>

            {/*
              容器查询（.currents-content 已声明 container）：
              默认单列 → ≥720px 主卡独行 + 次要 2×2 → ≥1100px 主卡 7/12 + 右 2×2。
              items-start 防止主卡被右侧拉高留下内部空白。
            */}
            <div className="grid items-start gap-4 @min-[720px]/main:grid-cols-2 @min-[1100px]/main:grid-cols-12">
              {/* 主故事卡：保留编辑层级，不按次要卡拉高 */}
              <TransitionLink
                href={`/currents/${lead.id}`}
                className="currents-surface-highlight rounded-xl p-6 @min-[720px]/main:col-span-2 @min-[1100px]/main:col-span-7"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <ScoreBadge score={lead.score} />
                  {nameOf(lead.sourceId) && <span>{nameOf(lead.sourceId)}</span>}
                  {(lead.sourceCount ?? 1) > 1 && <span>{t("sourcesCount", { count: lead.sourceCount ?? 1 })}</span>}
                </div>
                <h3 className="mb-2 max-w-3xl text-xl font-semibold leading-snug tracking-tight">
                  {lead.title}
                </h3>
                {lead.summary && (
                  <p className="line-clamp-3 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    {lead.summary}
                  </p>
                )}
                {lead.reason && (
                  <p className="mt-3 line-clamp-2 max-w-3xl border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                    {lead.reason}
                  </p>
                )}
              </TransitionLink>

              {/* 次要卡：2×2（中/宽容器），窄容器自动单列；数据不足自然缩减 */}
              {items.length > 0 && (
                <div className="grid items-start gap-3 @min-[720px]/main:col-span-2 @min-[720px]/main:grid-cols-2 @min-[1100px]/main:col-span-5">
                  {items.slice(0, 4).map((item, i) => (
                    <TransitionLink
                      key={item.id}
                      href={`/currents/${item.id}`}
                      className="currents-surface-highlight flex h-full flex-col gap-1.5 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold tabular-nums text-[var(--text-muted)]">
                          {String(i + 2).padStart(2, "0")}
                        </span>
                        <ScoreBadge score={item.score} />
                      </div>
                      <h4 className="line-clamp-3 text-sm font-medium leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-auto text-[11px] text-[var(--text-muted)]">
                        {nameOf(item.sourceId)}
                      </p>
                    </TransitionLink>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
