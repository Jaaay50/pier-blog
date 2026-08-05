"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchHighlights, fetchStats } from "@/lib/currents/api";
import type { CurrentsHighlightCard, CurrentsSource, CurrentsStats } from "@/lib/currents/types";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  locale: string;
  sourceMap: Map<string, CurrentsSource>;
}

/** 今日要闻：1 个主故事 + 4 个次要榜单项；数据不足自动缩/隐藏。 */
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
    <div className="px-6 pt-8">
      <div className="mx-auto max-w-6xl">
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
            <Link href="/currents/daily" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
              {t("viewDaily")} →
            </Link>
          </p>
        )}

        {loaded && lead && (
          <section aria-label={t("highlightsTitle")} className="mb-8">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {t("highlightsTitle")}
            </h2>
            <div className="grid gap-4 lg:grid-cols-5">
              {/* 主故事卡 */}
              <Link
                href={`/currents/${lead.id}`}
                className="card-glass card-glass-hover rounded-xl p-6 lg:col-span-3"
              >
                <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <ScoreBadge score={lead.score} />
                  {nameOf(lead.sourceId) && <span>{nameOf(lead.sourceId)}</span>}
                  {(lead.sourceCount ?? 1) > 1 && <span>{t("sourcesCount", { count: lead.sourceCount ?? 1 })}</span>}
                </div>
                <h3 className="mb-2 text-xl font-semibold leading-snug tracking-tight">{lead.title}</h3>
                {lead.summary && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{lead.summary}</p>
                )}
                {lead.reason && (
                  <p className="mt-3 line-clamp-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                    {lead.reason}
                  </p>
                )}
              </Link>

              {/* 次要榜单 */}
              <div className="flex flex-col gap-2 lg:col-span-2">
                {items.map((item, i) => (
                  <Link
                    key={item.id}
                    href={`/currents/${item.id}`}
                    className="card-glass card-glass-hover flex items-start gap-3 rounded-xl px-4 py-3"
                  >
                    <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-[var(--text-muted)]">
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</h4>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{nameOf(item.sourceId)}</p>
                    </div>
                    <ScoreBadge score={item.score} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
