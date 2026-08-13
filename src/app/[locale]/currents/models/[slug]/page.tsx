import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { serverFetchModelDetail } from "@/lib/currents/api";
import {
  confidenceTier,
  isValidModelSlug,
  type ModelsCategory,
  type ModelsDetailRanking,
  type ModelsDetailResponse,
} from "@/lib/currents/models-types";
import { TransitionLink } from "@/components/TransitionLink";
import { ModelTopicLink } from "@/components/currents/ModelTopicLink";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // 运行时按需生成，不预构建
}

const SITE_URL = "https://ethanpier.com";
const OG_IMAGE = `${SITE_URL}/og?type=site`;
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

function modelPath(locale: string, slug: string) {
  return `/${locale}/currents/models/${slug}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidModelSlug(slug)) return {};
  const detail = await serverFetchModelDetail(slug);
  if (!detail) return {};
  const t = await getTranslations({ locale, namespace: "currents" });

  const title = `${detail.model.name} — ${t("modelsTitle")} · Pier`;
  const description = t("modelsDetailDescription", { name: detail.model.name, vendor: detail.model.vendor });
  const canonicalUrl = `${SITE_URL}${modelPath(locale, slug)}`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}${modelPath("en", slug)}`,
        zh: `${SITE_URL}${modelPath("zh", slug)}`,
        "x-default": `${SITE_URL}${modelPath("en", slug)}`,
      },
    },
    openGraph: { title, description, type: "website", url: canonicalUrl, images: [{ url: OG_IMAGE, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

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

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatUsd(v: number | null): string {
  if (v === null) return "—";
  return `$${v % 1 === 0 ? v.toFixed(0) : String(v)}`;
}

/** 静态 SVG 名次迷你曲线（rank 越小越好 → 反向 y 轴；≤1 个点不画线）。 */
function RankSparkline({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(((p - min) / span) * (h - 6) + 3).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function SourceBreakdown({
  ranking,
  sourceNames,
  t,
}: {
  ranking: ModelsDetailRanking;
  sourceNames: Map<string, string>;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const percentiles = ranking.sources.map((s) => s.percentile);
  const spread = percentiles.length >= 2 ? Math.max(...percentiles) - Math.min(...percentiles) : 0;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[13px]">
        <caption className="sr-only">
          {t(CATEGORY_KEY[ranking.category])} — {t("modelsDetailSourceBreakdown")}
        </caption>
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <th scope="col" className="py-1.5 pr-3 font-medium">{t("modelsDetailColSource")}</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("modelsDetailColPercentile")}</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("modelsDetailColRaw")}</th>
            <th scope="col" className="py-1.5 font-medium">{t("modelsDetailColConfig")}</th>
          </tr>
        </thead>
        <tbody>
          {ranking.sources.flatMap((src) =>
            src.boards.map((board, bi) => (
              <tr key={`${src.sourceId}-${board.board}`} className="border-b border-[var(--border)] last:border-b-0">
                <td className="py-2 pr-3">
                  {bi === 0 ? (
                    <span className="flex flex-wrap items-center gap-1.5 text-[var(--text-primary)]">
                      {sourceNames.get(src.sourceId) ?? src.sourceId}
                      {src.stale && (
                        <span className="rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">
                          {t("modelsStale")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="pl-3 text-[var(--text-muted)]">· {board.board}</span>
                  )}
                  {bi === 0 && src.boards.length > 1 && (
                    <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">{board.board}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-primary)]">{board.percentile.toFixed(1)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-secondary)]">{board.rawScore.toFixed(1)}</td>
                <td className="py-2 text-[12px] text-[var(--text-muted)]">
                  {board.fold === "default"
                    ? t("modelsDetailFoldDefault")
                    : board.fold === "median"
                      ? t("modelsDetailFoldMedian", { count: board.configCount })
                      : t("modelsDetailFoldSingle")}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      {percentiles.length >= 2 && (
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
          {t("modelsDetailSpread", { spread: spread.toFixed(1) })}
        </p>
      )}
    </div>
  );
}

export default async function CurrentsModelDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isValidModelSlug(slug)) notFound();
  const detail: ModelsDetailResponse | null = await serverFetchModelDetail(slug);
  if (!detail) notFound();

  const t = await getTranslations("currents");
  const { model, price, rankings, history, aliases } = detail;

  // 来源 id → 展示名（从 rankings sources 无名称，这里用固定映射保持与方法页一致）
  const sourceNames = new Map<string, string>([
    ["lmarena", "LMArena"],
    ["livebench", "LiveBench"],
    ["epoch", "Epoch AI"],
    ["swebench", "SWE-bench Verified"],
    ["deepswe", "DeepSWE"],
    ["ale", "Agents' Last Exam"],
  ]);

  const orderedRankings = [...rankings].sort(
    (a, b) =>
      ["overall", "coding", "agent", "reasoning", "value"].indexOf(a.category) -
      ["overall", "coding", "agent", "reasoning", "value"].indexOf(b.category),
  );

  const historyByCategory = new Map<ModelsCategory, number[]>();
  for (const h of [...history].reverse()) {
    const list = historyByCategory.get(h.category) ?? [];
    list.push(h.rank);
    historyByCategory.set(h.category, list);
  }

  const releaseDate = formatDate(model.releaseDate, locale);
  const verifiedAt = formatDate(model.verifiedAt, locale);
  const priceVerifiedAt = formatDate(price.verifiedAt, locale);
  const modelNotes = locale === "en" && model.notes && CJK_RE.test(model.notes) ? null : model.notes;
  const priceNotes = locale === "en" && price.notes && CJK_RE.test(price.notes) ? null : price.notes;

  return (
    <article className="pb-16 pt-14">
      <TransitionLink
        href="/currents/models"
        className="text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        ← {t("modelsDetailBack")}
      </TransitionLink>

      <header className="mt-4 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{model.name}</h1>
          {model.status === "preview" && (
            <span className="rounded-full border border-[var(--border-hover)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
              Preview
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          <ModelTopicLink vendorId={model.vendorId} vendorName={model.vendor} />
        </p>
      </header>

      {/* 官方信息 */}
      <section aria-labelledby="model-official" className="rounded-xl border border-[var(--border)] p-4">
        <h2 id="model-official" className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          {t("modelsDetailOfficial")}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {releaseDate && (
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-[var(--text-muted)]">{t("modelsDetailReleaseDate")}</dt>
              <dd className="tabular-nums text-[var(--text-primary)]">{releaseDate}</dd>
            </div>
          )}
          {model.contextWindow !== null && (
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-[var(--text-muted)]">{t("modelsDetailContext")}</dt>
              <dd className="tabular-nums text-[var(--text-primary)]">{model.contextWindow.toLocaleString("en-US")} tokens</dd>
            </div>
          )}
          {model.officialModelId && (
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-[var(--text-muted)]">{t("modelsDetailOfficialId")}</dt>
              <dd className="break-all font-mono text-[12px] text-[var(--text-primary)]">{model.officialModelId}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-[var(--text-muted)]">{t("modelsDetailPrice")}</dt>
            <dd className="text-[var(--text-primary)]">
              {price.kind === "payg" ? (
                <span className="tabular-nums">
                  {formatUsd(price.inputUsdPerMtok)} / {formatUsd(price.outputUsdPerMtok)}{" "}
                  <span className="text-[11px] text-[var(--text-muted)]">{t("modelsPriceUnit")}</span>
                </span>
              ) : (
                <span>
                  {price.kind === "subscription"
                    ? t("modelsPriceSubscription")
                    : price.kind === "local"
                      ? t("modelsPriceLocal")
                      : t("modelsPriceUnavailable")}
                </span>
              )}
              {priceNotes && (
                <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">
                  {locale === "zh" ? `（${priceNotes}）` : `(${priceNotes})`}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
          {model.officialUrl && (
            <>
              <a
                href={model.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                {t("modelsDetailOfficialLink")}
              </a>
              {" · "}
            </>
          )}
          {verifiedAt ? t("modelsDetailVerifiedAt", { date: verifiedAt }) : t("modelsDetailUnverified")}
          {price.sourceUrl && priceVerifiedAt && (
            <>
              {" · "}
              <a href={price.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                {t("modelsDetailPriceSource")}
              </a>{" "}
              ({priceVerifiedAt})
            </>
          )}
        </p>
        {modelNotes && <p className="mt-2 text-[12px] text-[var(--text-muted)]">{modelNotes}</p>}
      </section>

      {/* 各类别排名 + 来源分项 */}
      <section aria-labelledby="model-rankings" className="mt-8">
        <h2 id="model-rankings" className="mb-4 text-base font-semibold text-[var(--text-primary)]">
          {t("modelsDetailRankings")}
        </h2>
        {orderedRankings.length === 0 && (
          <p className="rounded-xl border border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            {t("modelsDetailNoRankings")}
          </p>
        )}
        <div className="space-y-6">
          {orderedRankings.map((r) => {
            const tier = confidenceTier(r.confidence);
            const rankHistory = historyByCategory.get(r.category) ?? [];
            return (
              <div key={r.category} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t(CATEGORY_KEY[r.category])}</h3>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-secondary)]">
                      #{r.rank}
                      {r.status === "observing" && ` · ${t("modelsObserving")}`}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] tabular-nums ${TIER_CLASS[tier]}`}>
                      {t(tier === "high" ? "modelsConfHigh" : tier === "medium" ? "modelsConfMedium" : "modelsConfLow")}{" "}
                      {r.confidence.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RankSparkline
                      points={rankHistory}
                      label={t("modelsDetailHistoryLabel", { category: t(CATEGORY_KEY[r.category]) })}
                    />
                    <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                      {r.category === "value" && r.valueScore !== null ? r.valueScore.toFixed(1) : r.abilityScore.toFixed(1)}
                    </span>
                  </div>
                </div>
                {r.category !== "value" ? (
                  <SourceBreakdown ranking={r} sourceNames={sourceNames} t={t} />
                ) : (
                  <p className="mt-2 text-[12px] text-[var(--text-muted)]">{t("modelsDetailValueNote")}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 别名与配置 */}
      {aliases.length > 0 && (
        <section aria-labelledby="model-aliases" className="mt-8">
          <h2 id="model-aliases" className="mb-2 text-base font-semibold text-[var(--text-primary)]">
            {t("modelsDetailAliases")}
          </h2>
          <p className="mb-3 text-[12px] text-[var(--text-muted)]">{t("modelsDetailAliasesNote")}</p>
          <ul className="flex flex-wrap gap-2">
            {aliases.map((a) => (
              <li
                key={`${a.alias}-${a.sourceId ?? ""}`}
                className="rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)]"
                title={locale === "en" && a.configLabel && CJK_RE.test(a.configLabel) ? undefined : a.configLabel ?? undefined}
              >
                {a.alias}
                {a.configLabel && !(locale === "en" && CJK_RE.test(a.configLabel)) && (
                  <span className="ml-1 text-[var(--text-muted)]">· {a.configLabel}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-[12px] text-[var(--text-muted)]">
        <TransitionLink href="/currents/models/methodology" className="text-[var(--accent)] hover:underline">
          {t("modelsMethodologyLink")}
        </TransitionLink>
      </p>
    </article>
  );
}
