"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fetchModelsMeta } from "@/lib/currents/api";
import type { ModelsMetaResponse } from "@/lib/currents/models-types";
import { CurrentsError } from "./CurrentsError";
import { ModelsUpdateStatus } from "./ModelsUpdateStatus";

const CATEGORY_KEY: Record<string, string> = {
  overall: "modelsCatOverall",
  coding: "modelsCatCoding",
  agent: "modelsCatAgent",
  reasoning: "modelsCatReasoning",
  value: "modelsCatValue",
};

const SOURCE_METHOD_KEY: Record<string, string> = {
  lmarena: "modelsMethMethodLmarena",
  livebench: "modelsMethMethodLivebench",
  epoch: "modelsMethMethodEpoch",
  swebench: "modelsMethMethodSwebench",
  deepswe: "modelsMethMethodDeepswe",
  ale: "modelsMethMethodAle",
};

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;

const PRICE_RESULT_LABELS: Record<string, readonly [string, string]> = {
  updated: ["价格已更新", "Price updated"],
  unchanged: ["价格未变化", "Price unchanged"],
  manual: ["人工修改待复核", "Manual change requires review"],
  model_not_found: ["未找到精确型号报价", "Exact model price not found"],
  invalid_price: ["价格数据校验失败", "Price validation failed"],
  fetch_failed: ["官方来源读取失败", "Official source request failed"],
  timeout: ["官方来源读取超时", "Official source request timed out"],
  no_verified_source: ["暂无已核验价格来源", "No verified price source"],
  adapter_unverified: ["来源解析规则待核验", "Source parser requires verification"],
};

/**
 * 方法页动态部分：来源运行状态（最近成功更新时间、陈旧标记）、评分参数、
 * 模型计数与 pending 数。静态收录规则与公式说明由页面服务端渲染。
 */
export function ModelsMethodologyClient() {
  const t = useTranslations("currents");
  const locale = useLocale();
  const [data, setData] = useState<ModelsMetaResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchModelsMeta(controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
        setStatus("ok");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [retryCount]);

  const loading = status === "loading";
  const error = status === "error";
  const retry = useCallback(() => {
    setStatus("loading");
    setRetryCount((c) => c + 1);
  }, []);

  const formatTime = (iso: string | null) => {
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
  };

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--currents-surface-list)]" />
        ))}
      </div>
    );
  }
  if (error) return <CurrentsError onRetry={retry} />;
  if (!data) return null;

  const weights = data.scoringParams.confidenceWeights;
  const zh = locale === "zh";
  const priceUpdate = data.priceUpdate;
  const modelNames = new Map(data.models.map((model) => [model.slug, model]));
  const priceResults = Object.entries(priceUpdate?.models ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const priceStatusLabels = zh
    ? { never: "尚未检查", ok: "本轮检查完成", partial: "部分检查失败", failed: "本轮检查失败" }
    : { never: "Not checked", ok: "Check completed", partial: "Some checks failed", failed: "Check failed" };
  const priceTime = (iso: string | null) => iso ? (
    <time dateTime={iso} title={`${iso} (UTC)`}>
      {new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", {
        timeZone: "Asia/Hong_Kong", year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      }).format(new Date(iso))}
    </time>
  ) : "—";

  return (
    <div className="space-y-8">
      {data.update && (
        <section aria-labelledby="meth-ability-update">
          <h2 id="meth-ability-update" className="mb-3 text-base font-semibold text-[var(--text-primary)]">
            {zh ? "能力评测更新" : "Ability assessment updates"}
          </h2>
          <ModelsUpdateStatus update={data.update} detailed sourceNames={Object.fromEntries(data.sources.map((source) => [source.id, source.name]))} />
        </section>
      )}
      {priceUpdate && (
        <section aria-labelledby="meth-price-update">
          <h2 id="meth-price-update" className="mb-3 text-base font-semibold text-[var(--text-primary)]">
            {zh ? "官方价格检查" : "Official price checks"}
          </h2>
          <dl className="mb-3 grid gap-3 rounded-xl border border-[var(--border)] p-4 text-[13px] sm:grid-cols-3">
            <div>
              <dt className="text-[var(--text-muted)]">{zh ? "检查状态" : "Check status"}</dt>
              <dd className="text-[var(--text-primary)]">{priceStatusLabels[priceUpdate.status]}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">{zh ? "最近价格检查" : "Last price check"}</dt>
              <dd className="tabular-nums text-[var(--text-primary)]">{priceTime(priceUpdate.checkedAt)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">{zh ? "价格内容变化" : "Price content changed"}</dt>
              <dd className="tabular-nums text-[var(--text-primary)]">{priceTime(priceUpdate.changedAt)}</dd>
            </div>
          </dl>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <caption className="sr-only">{zh ? "逐模型价格检查结果" : "Price check results by model"}</caption>
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  {[zh ? "模型" : "Model", zh ? "厂商" : "Vendor", zh ? "检查结果" : "Check result", zh ? "状态码" : "Status code"].map((label) => (
                    <th key={label} scope="col" className="px-3 py-2 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceResults.map(([slug, result]) => {
                  const model = modelNames.get(slug);
                  return (
                    <tr key={slug} className="border-b border-[var(--border)] last:border-b-0">
                      <th scope="row" className="px-3 py-2.5 text-left font-medium text-[var(--text-primary)]">{model?.name ?? slug}</th>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">{model?.vendor ?? "—"}</td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                        {PRICE_RESULT_LABELS[result]?.[zh ? 0 : 1] ?? (zh ? "未知检查结果" : "Unknown check result")}
                      </td>
                      <td className="max-w-[240px] break-words px-3 py-2.5 font-mono text-[12px] text-[var(--text-muted)]">{result}</td>
                    </tr>
                  );
                })}
                {priceResults.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[var(--text-muted)]">{zh ? "暂无价格检查记录" : "No price check records"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {/* 来源状态 */}
      <section aria-labelledby="meth-sources">
        <h2 id="meth-sources" className="mb-3 text-base font-semibold text-[var(--text-primary)]">
          {t("modelsMethSources")}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <caption className="sr-only">{t("modelsMethSources")}</caption>
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                <th scope="col" className="px-3 py-2 font-medium">{t("modelsMethColSource")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("modelsMethColOperator")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("modelsMethColCategories")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("modelsMethColLicense")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("modelsMethColUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-3 py-2.5">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[var(--text-primary)] hover:underline"
                    >
                      {s.name}
                    </a>
                    {locale === "zh" || SOURCE_METHOD_KEY[s.id] ? (
                      <div className="mt-0.5 max-w-[320px] text-[11px] leading-relaxed text-[var(--text-muted)]">
                        {locale === "zh" ? s.method : t(SOURCE_METHOD_KEY[s.id])}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                    {locale === "en" && CJK_RE.test(s.operatorName) ? s.name : s.operatorName}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--text-secondary)]">
                    {s.categories.map((category) => CATEGORY_KEY[category] ? t(CATEGORY_KEY[category]) : category).join(" / ")}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)]">
                    {locale === "en" && CJK_RE.test(s.license) ? "Public source" : s.license}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {s.lastSuccessAt ? (
                      <span className="tabular-nums text-[var(--text-secondary)]">{formatTime(s.lastSuccessAt)}</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                    {s.stale && (
                      <span className="ml-1.5 rounded-full border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">
                        {t("modelsStale")}
                      </span>
                    )}
                    {s.lastStatus === "failed" && (
                      <span className="ml-1.5 rounded-full border border-[var(--border-hover)] px-1.5 py-px text-[10px] text-[var(--text-secondary)]">
                        {t("modelsMethLastFailed")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 当前参数（后端真实值，非硬编码文案） */}
      <section aria-labelledby="meth-params">
        <h2 id="meth-params" className="mb-3 text-base font-semibold text-[var(--text-primary)]">
          {t("modelsMethParams")}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-[var(--border)] p-4 text-[13px] sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{t("modelsMethScoringVersion")}</dt>
            <dd className="font-mono text-[var(--text-primary)]">{data.scoringVersion}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{t("modelsMethWeights")}</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {Math.round(weights.coverage * 100)} / {Math.round(weights.freshness * 100)} /{" "}
              {Math.round(weights.agreement * 100)} / {Math.round(weights.identity * 100)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{t("modelsMethMinCoverage")}</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {t("modelsMethCoveragePolicy")}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{t("modelsMethValueCost")}</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {data.scoringParams.valueCost.inputMtok}M in + {data.scoringParams.valueCost.outputMtok}M out
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{t("modelsMethModelCount")}</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">
              {t("modelsMethModelCountValue", {
                released: data.modelCounts.released ?? 0,
                preview: data.modelCounts.preview ?? 0,
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{t("modelsMethPending")}</dt>
            <dd className="tabular-nums text-[var(--text-primary)]">{data.pendingCount}</dd>
          </div>
          {data.computedAt && (
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">{t("modelsMethComputedAt")}</dt>
              <dd className="tabular-nums text-[var(--text-primary)]">{formatTime(data.computedAt)}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
