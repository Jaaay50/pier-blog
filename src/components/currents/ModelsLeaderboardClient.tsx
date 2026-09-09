"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link as TransitionLink } from "@/i18n/navigation";
import { priceSummary } from "@/lib/currents/model-prices";
import { fetchModelsLeaderboard } from "@/lib/currents/api";
import {
  MODELS_CATEGORIES,
  confidenceTier,
  unifiedLeaderboardRows,
  formatModelScore,
  type ModelsCategory,
  type ModelsLeaderboardResponse,
  type ModelsLeaderboardRow,
  type ModelsView,
} from "@/lib/currents/models-types";
import { CurrentsError } from "./CurrentsError";
import { ModelsUpdateStatus } from "./ModelsUpdateStatus";
import { usePriceClock } from "./usePriceClock";
import { rateIsCurrent } from "@/lib/currents/model-prices";

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

/** 排名变化：首次快照（prevRank=null）显示 —，不制造变化。 */
function RankDelta({ rank, prevRank, t }: { rank: number | null; prevRank: number | null; t: ReturnType<typeof useTranslations> }) {
  if (rank === null || prevRank === null) {
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

function ConfidenceBadge({ confidence, t }: { confidence: number | null; t: ReturnType<typeof useTranslations> }) {
  if (confidence === null) return <span className="text-[var(--text-muted)]">—</span>;
  const tier = confidenceTier(confidence);
  const label = t(tier === "high" ? "modelsConfHigh" : tier === "medium" ? "modelsConfMedium" : "modelsConfLow");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${TIER_CLASS[tier]}`}
    >
      {label} {confidence.toFixed(2)}
    </span>
  );
}

function PriceCell({ row, now, t }: { row: ModelsLeaderboardRow; now: number; t: ReturnType<typeof useTranslations> }) {
  const price = row.price;
  const lines = priceSummary(price, now);
  const hasPrice = lines.some((line) => line !== "—");
  const status = price.verification?.status ?? "unknown";
  const error = price.verification?.lastErrorCode;
  const verifiedAt = price.verifiedAt ? Date.parse(price.verifiedAt) : NaN;
  // Match detail-page freshness checks without changing priceSummary's tariff selection.
  const stale = status === "stale" || !!error
    || (!!price.rates?.length && !price.rates.some((rate) => rateIsCurrent(rate, now)))
    || (hasPrice && status === "verified" && (!Number.isFinite(verifiedAt) || now - verifiedAt > 7 * 86_400_000));
  // An unavailable price is not evidence that the vendor has never published pricing.
  const signal = hasPrice
    ? stale ? "modelsPriceRetained" : status === "verified" ? null : "modelsPriceUnverified"
    : error === "fetch_failed" ? "modelsPriceFetchFailed" : stale ? "modelsPriceReverify" : "modelsPriceNoVerified";
  return (
    <span className="inline-flex flex-col tabular-nums">
      {lines.map((line, i) => <span key={i}>{line}</span>)}
      {signal && (
        <TransitionLink
          href={`/currents/models/${row.model.slug}#model-pricing`}
          aria-label={t("modelsPriceDetailsLabel", { status: t(signal), model: row.model.name })}
          className={`mt-1 inline-flex min-h-6 items-center gap-1 text-xs text-[var(--text-secondary)] underline decoration-[var(--border-hover)] underline-offset-4 hover:text-[var(--text-primary)] ${FOCUS_CLASS}`}
        >
          {t(signal)}<span aria-hidden="true">›</span>
        </TransitionLink>
      )}
    </span>
  );
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
  t,
  now,
}: {
  rows: ModelsLeaderboardRow[];
  category: ModelsCategory;
  now: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const isValue = category === "value";
  return (
    <ul className="space-y-2 sm:hidden">
      {rows.map((row) => (
        <li key={row.model.slug} className="currents-surface-list rounded-xl border border-[var(--border)] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 tabular-nums text-[13px] text-[var(--text-muted)]">{row.rank === null ? "—" : `#${row.rank}`}</span>
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
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{row.model.vendor}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {formatModelScore(isValue ? row.valueScore : row.abilityScore)}
              </div>
              <div className="text-[11px] tabular-nums text-[var(--text-muted)]">
                <RankDelta rank={row.rank} prevRank={row.prevRank} t={t} />
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--text-secondary)]">
            <ConfidenceBadge confidence={row.confidence} t={t} />
            <PriceCell row={row} now={now} t={t} />
            {isValue && (
              <span className="tabular-nums text-[var(--text-muted)]">
                {t("modelsAbilityShort")} {formatModelScore(row.abilityScore)}
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
  t,
  now,
}: {
  rows: ModelsLeaderboardRow[];
  category: ModelsCategory;
  now: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const isValue = category === "value";
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] sm:block">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">
          {t(CATEGORY_KEY[category])} — {t("modelsMainBoard")}
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
              <span>{t("modelsColPrice")}</span>
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
              <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">{row.rank ?? "—"}</td>
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
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{row.model.vendor}</div>
              </td>
              <td className="px-3 py-3 text-right">
                <span className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatModelScore(isValue ? row.valueScore : row.abilityScore)}
                </span>
                {isValue && (
                  <div className="text-[11px] tabular-nums text-[var(--text-muted)]">
                    {t("modelsAbilityShort")} {formatModelScore(row.abilityScore)}
                  </div>
                )}
              </td>
              <td className="px-3 py-3">
                <ConfidenceBadge confidence={row.confidence} t={t} />
              </td>
              <td className="px-3 py-3 text-right text-[13px]">
                <PriceCell row={row} now={now} t={t} />
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

export function ModelsLeaderboardClient({ initial = null }: { initial?: ModelsLeaderboardResponse | null } = {}) {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [category, setCategory] = useState<ModelsCategory>("overall");
  const [view, setView] = useState<ModelsView>("released");
  const [data, setData] = useState<ModelsLeaderboardResponse | null>(initial);
  const [status, setStatus] = useState<"loading" | "ok" | "error">(initial ? "ok" : "loading");
  const initialSatisfiedRef = useRef(Boolean(initial));
  const [retryCount, setRetryCount] = useState(0);
  const panelId = useId();
  const categoryTabId = (cat: ModelsCategory) => `${panelId}-category-${cat}`;
  const viewTabId = (value: ModelsView) => `${panelId}-view-${value}`;

  useEffect(() => {
    if (initialSatisfiedRef.current) {
      initialSatisfiedRef.current = false;
      return;
    }
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
  const computedAt = formatTime(currentData?.meta.computedAt ?? null, locale);
  const priceRates = useMemo(() => [...(data?.items ?? []), ...(data?.observing ?? [])].flatMap(row => row.price.rates ?? []), [data]);
  const priceNow = usePriceClock(data ? Date.parse(data.meta.generatedAt) : 0, priceRates, undefined, data?.meta.valueValidUntil);
  const currentRows = currentData ? unifiedLeaderboardRows(currentData).map(row => {
    // Value rankings depend on a specific price snapshot. Hide the entire stale
    // comparison when a tariff boundary passes; never retain an expired bargain.
    const benchmarkId = row.price.benchmark?.rateId;
    const expired = !!benchmarkId && !row.price.rates?.some(rate => rate.id === benchmarkId && rateIsCurrent(rate, priceNow));
    return category === "value" && expired ? { ...row, rank: null, prevRank: null, valueScore: null } : row;
  }) : [];
  const valueExpired = category === "value" && !!data && (
    (!!data.meta.valueValidUntil && priceNow >= Date.parse(data.meta.valueValidUntil)) ||
    priceRates.some(rate => [rate.effectiveFrom, rate.effectiveUntil].some(boundary =>
      boundary && Date.parse(boundary) > Date.parse(data.meta.generatedAt) && Date.parse(boundary) <= priceNow))
  );
  const displayRows = valueExpired ? currentRows.map(row => ({ ...row, rank: null, prevRank: null, valueScore: null })) : currentRows;

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
          {!currentData?.meta.update && computedAt && <span className="tabular-nums">{t("modelsComputedAt", { time: computedAt })}</span>}
        </div>
      </div>

      {currentData && <ModelsUpdateStatus update={currentData.meta.update} />}

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
                <LeaderboardTable rows={displayRows} category={category} t={t} now={priceNow} />
                <LeaderboardCards rows={displayRows} category={category} t={t} now={priceNow} />
              </>
            )}
            <div className="mt-6">
              <TransitionLink
                href="/currents/models/methodology"
                className={`text-[var(--accent)] hover:underline ${FOCUS_CLASS}`}
              >
                {t("modelsMethodologyLink")}
              </TransitionLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
