"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { TransitionLink } from "@/components/TransitionLink";
import type { CurrentsItemDetail } from "@/lib/currents/types";
import { ScoreBadge } from "./ScoreBadge";
import { FavoriteButton } from "./FavoriteButton";
import { FeedbackForm, type FeedbackLabels } from "./FeedbackForm";
import { markRead } from "@/lib/currents/readState";

interface Labels {
  back: string;
  readOriginal: string;
  aiSummary: string;
  whyWorth: string;
  deepRead: string;
  deepReadPending: string;
  scoreBreakdown: string;
  related: string;
  tagsLabel: string;
  otherSources: string;
  originalTitleLabel: string;
  categoryLabels: Record<string, string>;
  translationTab: string;
  aiSummaryTab: string;
  deepReadTab: string;
  translationPending: string;
  feedback: FeedbackLabels;
}

interface Props {
  item: CurrentsItemDetail;
  deepReadHtml: string | null;
  translationHtml: string | null;
  locale: string;
  labels: Labels;
  sourceName: string | null;
}

const BREAKDOWN_KEYS = ["novelty", "impact", "practicality", "credibility", "timeliness"] as const;
const BREAKDOWN_LABEL: Record<(typeof BREAKDOWN_KEYS)[number], { zh: string; en: string }> = {
  novelty: { zh: "新颖性", en: "Novelty" },
  impact: { zh: "影响力", en: "Impact" },
  practicality: { zh: "实践价值", en: "Practicality" },
  credibility: { zh: "可信度", en: "Credibility" },
  timeliness: { zh: "时效性", en: "Timeliness" },
};

/** 详情页正文（客户端小岛：负责 markRead + 返回导航 + 收藏） */
export function CurrentsDetailBody({ item, deepReadHtml, translationHtml, locale, labels, sourceName }: Props) {
  const router = useRouter();
  type TabKey = "translation" | "summary" | "deepRead";
  const [tab, setTab] = useState<TabKey>(translationHtml ? "translation" : "summary");

  useEffect(() => {
    markRead(item.id);
  }, [item.id]);

  const published = item.publishedAt ? new Date(item.publishedAt) : null;
  const breakdown = item.scoreBreakdown ?? {};
  const sources = (item.alsoReportedBy ?? []).filter((s) => s.source_url || s.source_name);
  const related = item.related ?? [];

  return (
    <div className="py-14">
      {/* 顶部：返回 + 阅读原文 */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push("/currents");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {labels.back}
        </button>
        {item.canonicalUrl && (
          <a
            href={item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
          >
            {labels.readOriginal}
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        )}
      </div>

      <div className="flex gap-10">
        {/* 正文 720–760px */}
        <article className="min-w-0 max-w-[740px] flex-1">
          {/* Meta 行 */}
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            {(sourceName ?? item.sourceId) && (
              <span className="font-medium text-[var(--text-secondary)]">{sourceName ?? item.sourceId}</span>
            )}
            {item.author && (
              <span className="text-[var(--text-secondary)]">{item.author}</span>
            )}
            {published && (
              <time dateTime={item.publishedAt!}>
                {published.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            )}
            {item.category && (
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5">
                {labels.categoryLabels[item.category] ?? item.category}
              </span>
            )}
            <ScoreBadge score={item.score} />
            <FavoriteButton itemId={item.id} />
          </div>

          {/* 标题 + 原标题 */}
          <h1 className="font-display mb-2 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {item.title}
          </h1>
          {item.originalTitle && item.originalTitle !== item.title && (
            <p className="mb-8 text-sm text-[var(--text-muted)]">
              <span className="mr-1 opacity-70">{labels.originalTitleLabel}:</span>
              {item.originalTitle}
            </p>
          )}

          {/* 批次 2：三档 tab —— 原文翻译 / AI 导读 / 深度解读 */}
          <div role="tablist" aria-label="content" className="mb-6 flex gap-1 border-b border-[var(--border)]">
            {(
              [
                { key: "translation", label: labels.translationTab, disabled: !translationHtml },
                { key: "summary", label: labels.aiSummaryTab, disabled: !item.summary },
                { key: "deepRead", label: labels.deepReadTab, disabled: false },
              ] as Array<{ key: TabKey; label: string; disabled: boolean }>
            ).map(({ key, label, disabled }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-disabled={disabled}
                  title={disabled && key === "translation" ? labels.translationPending : undefined}
                  onClick={() => !disabled && setTab(key)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                    active
                      ? "border-[var(--accent)] font-medium text-[var(--accent)]"
                      : disabled
                        ? "cursor-not-allowed border-transparent text-[var(--text-muted)] opacity-50"
                        : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* tab：原文翻译 */}
          {tab === "translation" && (
            <section className="mb-10">
              {translationHtml ? (
                <div
                  className="prose currents-reader-prose max-w-none"
                  // 翻译由受信任后台 LLM 管线产出并经 rehype 序列化
                  dangerouslySetInnerHTML={{ __html: translationHtml }}
                />
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                  {labels.translationPending}
                </p>
              )}
            </section>
          )}

          {/* tab：AI 导读 */}
          {tab === "summary" && item.summary && (
            <section className="currents-surface-list mb-10 rounded-xl p-5">
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.summary}</p>
            </section>
          )}

          {/* tab：深度解读 */}
          {tab === "deepRead" && (
            <section className="mb-10">
              {item.deepRead ? (
                deepReadHtml ? (
                  <div
                    className="prose currents-reader-prose max-w-none"
                    // deepRead 由受信任后台 LLM 管线产出并经 rehype 序列化
                    dangerouslySetInnerHTML={{ __html: deepReadHtml }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.deepRead}</p>
                )
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                  {labels.deepReadPending}
                </p>
              )}
            </section>
          )}

          {/* 为什么值得读（保留独立小节，不入 tab） */}
          {item.reason && (
            <section className="mb-8">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.whyWorth}</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.reason}</p>
            </section>
          )}

          {/* 相关报道 */}
          {related.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.related}</h2>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <TransitionLink
                      href={`/currents/${r.id}`}
                      className="text-sm text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                    >
                      {r.title}
                    </TransitionLink>
                    {r.publishedAt && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        {new Date(r.publishedAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 标签 / 原始来源 */}
          {(item.tags?.length || sources.length > 0) && (
            <section className="border-t border-[var(--border)] pt-6">
              {item.tags && item.tags.length > 0 && (
                <div className="mb-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.tagsLabel}</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sources.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.otherSources}</h2>
                  <ul className="space-y-1.5">
                    {sources.map((s) => (
                      <li key={`${s.source_id}-${s.source_url}`} className="text-sm">
                        {s.source_url ? (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                            {s.source_name ?? s.source_id}
                            {s.source_title ? ` — ${s.source_title}` : ""}
                          </a>
                        ) : (
                          <span className="text-[var(--text-secondary)]">{s.source_name ?? s.source_id}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* 阶段 A：独立反馈入口（正文末尾低调折叠面板，不打扰阅读） */}
          <FeedbackForm targetType="item" targetId={item.id} locale={locale} labels={labels.feedback} />
        </article>

        {/* 右侧窄栏（桌面） */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 space-y-6">
            {item.scoreBreakdown && (
              <div className="currents-surface-list rounded-xl p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.scoreBreakdown}</h2>
                <ul className="space-y-2">
                  {BREAKDOWN_KEYS.map((k) => (
                    <li key={k} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{BREAKDOWN_LABEL[k][locale === "zh" ? "zh" : "en"]}</span>
                      <span className="font-medium tabular-nums text-[var(--text-secondary)]">{breakdown[k] ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
