"use client";

import { useCallback, useEffect, useId, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TransitionLink } from "@/components/TransitionLink";
import { fetchModelsLeaderboard } from "@/lib/currents/api";
import {
  MODELS_CATEGORIES,
  confidenceTier,
  type ModelsCategory,
  type ModelsLeaderboardResponse,
  type ModelsLeaderboardRow,
  type ModelsView,
} from "@/lib/currents/models-types";
import { CurrentsError } from "./CurrentsError";

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

const CATEGORY_KEY: Record<ModelsCategory, string> = {
  overall: "modelsCatOverall",
  coding: "modelsCatCoding",
  agent: "modelsCatAgent",
  reasoning: "modelsCatReasoning",
  value: "modelsCatValue",
};

const TIER_CLASS: Record<"high" | "medium" | "low", string> = {
  high: "border-[var(--accent)]/50 text-[var(--accent)]",
  medium: "border-[var(--border-hover)] text-[var(--text-secondary)]",
  low: "border-[var(--border)] text-[var(--text-muted)]",
};

function formatUsd(value: number | null): string | null {
  if (value === null) return null;
  return `$${value < 1 ? value.toFixed(value < 0.1 ? 3 : 2).replace(/0+$/, "").replace(/\.$/, "") : value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

/** 排名变化：首次快照（prevRank=null）显示 —，不制造变化。 */
function RankDelta({ rank, prevRank, t }: { rank: number; prevRank: number | null; t: ReturnType<typeof useTranslations> }) {
  if (prevRank === null) {
    return (
      <span className="text-[var(--text-muted)]" aria-label={t("modelsDeltaNone")}>
        —
      </span>
    );
  }
  const delta = prevRank - rank;
  if (delta === 0) {
    return (
      <span className="text-[var(--text-muted)]" aria-label={t("modelsDeltaFlat")}>
        ·
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={up ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}
      aria-label={up ? t("modelsDeltaUp", { count: delta }) : t("modelsDeltaDown", { count: -delta })}
    >
      {up ? "↑" : "↓"}
      {Math.abs(delta)}
    </span>
  );
}

function ConfidenceBadge({ confidence, t }: { confidence: number; t: ReturnType<typeof useTranslations> }) {
  const tier = confidenceTier(confidence);
  const label = t(tier === "high" ? "modelsConfHigh" : tier === "medium" ? "modelsConfMedium" : "modelsConfLow");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${TIER_CLASS[tier]}`}
      title={t("modelsConfTooltip")}
    >
      {label} {confidence.toFixed(2)}
    </span>
  );
}

function PriceCell({ row, t }: { row: ModelsLeaderboardRow; t: ReturnType<typeof useTranslations> }) {
  const { price } = row;
  if (price.kind === "payg" && price.inputUsdPerMtok !== null && price.outputUsdPerMtok !== null) {
    return (
      <span className="tabular-nums" title={t("modelsPriceUnit")}>
        {formatUsd(price.inputUsdPerMtok)} / {formatUsd(price.outputUsdPerMtok)}
      </span>
    );
  }
  const label =
    price.kind === "subscription"
      ? t("modelsPriceSubscription")
      : price.kind === "local"
        ? t("modelsPriceLocal")
        : t("modelsPriceUnavailable");
  return <span className="text-[var(--text-muted)]">{label}</span>;
}

function formatTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: "Asia/Hong_Kong",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 移动端（<sm）卡片列表：与表格同数据同语义，避免窄屏横向滚动。 */
function LeaderboardCards({
  rows,
  category,
  watching,
  t,
}: {
  rows: ModelsLeaderboardRow[];
  category: ModelsCategory;
  watching?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const isValue = category === "value";
  return (
    <ul className={`space-y-2 sm:hidden ${watching ? "opacity-90" : ""}`}>
      {rows.map((row) => (
        <li key={row.model.slug} className="currents-surface-list rounded-xl border border-[var(--border)] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 tabular-nums text-[13px] text-[var(--text-muted)]">#{row.rank}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <TransitionLink
                    href={`/currents/models/${row.model.slug}`}
                    className={`font-medium text-[var(--text-primary)] hover:underline ${FOCUS_CLASS}`}
                  >
                    {row.model.name}
                  </TransitionLink>
                  {row.model.status === "preview" && (
                    <span className="rounded-full border border-[var(--border-hover)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">
                      Preview
                    </span>
                  )}
                  {row.staleSources.length > 0 && (
                    <span
                      data-mobile-stale={row.model.slug}
                      className="rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-muted)]"
                      title={t("modelsStaleTooltip", { sources: row.staleSources.join(", ") })}
                    >
                      {t("modelsStale")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{row.model.vendor}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {isValue && row.valueScore !== null ? row.valueScore.toFixed(1) : row.abilityScore.toFixed(1)}
              </div>
              <div className="text-[11px] tabular-nums text-[var(--text-muted)]">
                <RankDelta rank={row.rank} prevRank={row.prevRank} t={t} />
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--text-secondary)]">
            <ConfidenceBadge confidence={row.confidence} t={t} />
            <PriceCell row={row} t={t} />
            {isValue && (
              <span className="tabular-nums text-[var(--text-muted)]">
                {t("modelsAbilityShort")} {row.abilityScore.toFixed(1)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function LeaderboardTable({
  rows,
  category,
  watching,
  t,
}: {
  rows: ModelsLeaderboardRow[];
  category: ModelsCategory;
  watching?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const isValue = category === "value";
  return (
    <div className={`hidden overflow-x-auto rounded-xl border border-[var(--border)] sm:block ${watching ? "opacity-90" : ""}`}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          {t(CATEGORY_KEY[category])} — {watching ? t("modelsObserving") : t("modelsMainBoard")}
        </caption>
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <th scope="col" className="px-3 py-2.5 font-medium">
              {t("modelsColRank")}
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              {t("modelsColModel")}
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              {isValue ? t("modelsColValueScore") : t("modelsColAbility")}
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              {t("modelsColConfidence")}
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              <span title={t("modelsPriceUnit")}>{t("modelsColPrice")}</span>
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              {t("modelsColDelta")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.model.slug}
              className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--currents-surface-list-hover)]"
            >
              <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">{row.rank}</td>
              <td className="px-3 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <TransitionLink
                    href={`/currents/models/${row.model.slug}`}
                    className={`font-medium text-[var(--text-primary)] hover:underline ${FOCUS_CLASS}`}
                  >
                    {row.model.name}
                  </TransitionLink>
                  {row.model.status === "preview" && (
                    <span className="rounded-full border border-[var(--border-hover)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">
                      Preview
                    </span>
                  )}
                  {row.staleSources.length > 0 && (
                    <span
                      className="rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-muted)]"
                      title={t("modelsStaleTooltip", { sources: row.staleSources.join(", ") })}
                    >
                      {t("modelsStale")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{row.model.vendor}</div>
              </td>
              <td className="px-3 py-3 text-right">
                <span className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
                  {isValue && row.valueScore !== null ? row.valueScore.toFixed(1) : row.abilityScore.toFixed(1)}
                </span>
                {isValue && (
                  <div className="text-[11px] tabular-nums text-[var(--text-muted)]">
                    {t("modelsAbilityShort")} {row.abilityScore.toFixed(1)}
                  </div>
                )}
              </td>
              <td className="px-3 py-3">
                <ConfidenceBadge confidence={row.confidence} t={t} />
              </td>
              <td className="px-3 py-3 text-right text-[13px]">
                <PriceCell row={row} t={t} />
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                <RankDelta rank={row.rank} prevRank={row.prevRank} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModelsLeaderboardClient() {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [category, setCategory] = useState<ModelsCategory>("overall");
  const [view, setView] = useState<ModelsView>("released");
  const [data, setData] = useState<ModelsLeaderboardResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const panelId = useId();
  const categoryTabId = (cat: ModelsCategory) => `${panelId}-category-${cat}`;
  const viewTabId = (value: ModelsView) => `${panelId}-view-${value}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchModelsLeaderboard(category, view, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
        setStatus("ok");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [category, view, retryCount]);

  const loading = status === "loading";
  const error = status === "error";
  const selectCategory = useCallback((cat: ModelsCategory) => {
    if (cat === category) return;
    setCategory(cat);
    setData(null);
    setStatus("loading");
  }, [category]);
  const selectView = useCallback((v: ModelsView) => {
    if (v === view) return;
    setView(v);
    setData(null);
    setStatus("loading");
  }, [view]);
  const retry = useCallback(() => {
    setStatus("loading");
    setRetryCount((c) => c + 1);
  }, []);

  const currentData = status === "ok" && data?.category === category && data.view === view ? data : null;
  const staleSources = (currentData?.meta.sources ?? []).filter((s) => s.stale);
  const computedAt = formatTime(currentData?.meta.computedAt ?? null, locale);

  const focusTab = <T extends string>(values: readonly T[], nextIndex: number, idFor: (value: T) => string) => {
    const value = values[(nextIndex + values.length) % values.length];
    document.getElementById(idFor(value))?.focus();
    return value;
  };

  const onCategoryKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cat: ModelsCategory) => {
    const index = MODELS_CATEGORIES.indexOf(cat);
    let next: ModelsCategory | null = null;
    if (event.key === "ArrowRight") next = focusTab(MODELS_CATEGORIES, index + 1, categoryTabId);
    else if (event.key === "ArrowLeft") next = focusTab(MODELS_CATEGORIES, index - 1, categoryTabId);
    else if (event.key === "Home") next = focusTab(MODELS_CATEGORIES, 0, categoryTabId);
    else if (event.key === "End") next = focusTab(MODELS_CATEGORIES, MODELS_CATEGORIES.length - 1, categoryTabId);
    if (next) {
      event.preventDefault();
      selectCategory(next);
    }
  };

  const viewValues = ["released", "preview"] as const;
  const onViewKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: ModelsView) => {
    const index = viewValues.indexOf(current);
    let next: ModelsView | null = null;
    if (event.key === "ArrowRight") next = focusTab(viewValues, index + 1, viewTabId);
    else if (event.key === "ArrowLeft") next = focusTab(viewValues, index - 1, viewTabId);
    else if (event.key === "Home") next = focusTab(viewValues, 0, viewTabId);
    else if (event.key === "End") next = focusTab(viewValues, viewValues.length - 1, viewTabId);
    if (next) {
      event.preventDefault();
      selectView(next);
    }
  };

  return (
    <div>
      {/* 五类榜单切换 */}
      <div role="tablist" aria-label={t("modelsCatLabel")} className="mb-4 flex flex-wrap gap-2">
        {MODELS_CATEGORIES.map((cat) => (
          <button
            key={cat}
            id={categoryTabId(cat)}
            role="tab"
            aria-selected={category === cat}
            aria-controls={panelId}
            tabIndex={category === cat ? 0 : -1}
            onClick={() => selectCategory(cat)}
            onKeyDown={(event) => onCategoryKeyDown(event, cat)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${FOCUS_CLASS} ${
              category === cat
                ? "border-[var(--accent)] bg-[var(--accent)] font-medium text-white"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t(CATEGORY_KEY[cat])}
          </button>
        ))}
      </div>

      {/* 正式 / Preview 视图 + 数据时间 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("modelsViewLabel")} className="flex gap-1 rounded-full border border-[var(--border)] p-0.5">
          {viewValues.map((v) => (
            <button
              key={v}
              id={viewTabId(v)}
              role="tab"
              aria-selected={view === v}
              aria-controls={panelId}
              tabIndex={view === v ? 0 : -1}
              onClick={() => selectView(v)}
              onKeyDown={(event) => onViewKeyDown(event, v)}
              className={`rounded-full px-3 py-1 text-[12px] transition-colors ${FOCUS_CLASS} ${
                view === v
                  ? "bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {v === "released" ? t("modelsViewReleased") : t("modelsViewPreview")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          {staleSources.length > 0 && (
            <span
              className="rounded-full border border-[var(--border)] px-2 py-0.5"
              title={t("modelsStaleTooltip", { sources: staleSources.map((s) => s.name).join(", ") })}
            >
              {t("modelsStaleSourcesNote", { count: staleSources.length })}
            </span>
          )}
          {computedAt && <span className="tabular-nums">{t("modelsComputedAt", { time: computedAt })}</span>}
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${categoryTabId(category)} ${viewTabId(view)}`}
      >
        {loading && (
          <div role="status" aria-live="polite">
            <span className="sr-only">{t("loading")}</span>
            <div className="space-y-2" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--currents-surface-list)]" />
              ))}
            </div>
          </div>
        )}

        {!loading && error && <CurrentsError onRetry={retry} />}

        {!loading && !error && currentData && (
          <>
            {currentData.items.length === 0 && currentData.observing.length === 0 ? (
              <p className="rounded-xl border border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                {currentData.meta.empty ? t("modelsEmptyPreparing") : t("modelsEmptyView")}
              </p>
            ) : (
              <>
                {currentData.items.length > 0 && (
                  <>
                    <LeaderboardTable rows={currentData.items} category={category} t={t} />
                    <LeaderboardCards rows={currentData.items} category={category} t={t} />
                  </>
                )}
                {currentData.observing.length > 0 && (
                  <section className="mt-8">
                    <h2 className="mb-1 text-base font-semibold text-[var(--text-primary)]">
                      {t("modelsObserving")}
                    </h2>
                    <p className="mb-3 text-[12px] text-[var(--text-muted)]">{t("modelsObservingNote")}</p>
                    <LeaderboardTable rows={currentData.observing} category={category} watching t={t} />
                    <LeaderboardCards rows={currentData.observing} category={category} watching t={t} />
                  </section>
                )}
              </>
            )}
            <p className="mt-6 text-[12px] leading-relaxed text-[var(--text-muted)]">
              {t("modelsFooterNote")}{" "}
              <TransitionLink
                href="/currents/models/methodology"
                className={`text-[var(--accent)] hover:underline ${FOCUS_CLASS}`}
              >
                {t("modelsMethodologyLink")}
              </TransitionLink>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
