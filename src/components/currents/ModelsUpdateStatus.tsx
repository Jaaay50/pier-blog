"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ModelsUpdate } from "@/lib/currents/models-types";

/** Refresh timestamps describe collection, not API response generation or rank computation. */
export function ModelsUpdateStatus({ update, detailed = false, sourceNames = {} }: {
  update?: ModelsUpdate;
  detailed?: boolean;
  sourceNames?: Record<string, string>;
}) {
  const t = useTranslations("currents");
  const locale = useLocale();
  if (!update) return null;

  const time = (iso: string) => (
    <time dateTime={iso} title={`${iso} (UTC)`}>
      {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        timeZone: "Asia/Hong_Kong", year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      }).format(new Date(iso))}
    </time>
  );
  const warning = ["partial", "failed", "stale"].includes(update.status);
  return (
    <div className="space-y-2 text-xs text-[var(--text-secondary)]" role="status" aria-live="polite">
      <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
        {update.lastAttemptAt && <span>{t("modelsUpdateLastCheck")} {time(update.lastAttemptAt)}</span>}
        {update.lastContentChangeAt && <span>{t("modelsUpdateLastChange")} {time(update.lastContentChangeAt)}</span>}
        {update.nextScheduledCheckAt && <span>{t("modelsUpdateNextCheck")} {time(update.nextScheduledCheckAt)}</span>}
      </div>
      {update.status !== "ok" && (
        <p className={warning ? "rounded-lg border border-[var(--border-hover)] px-3 py-2 text-[var(--text-primary)]" : undefined}>
          {t(`modelsUpdateStatus_${update.status}`)}
        </p>
      )}
      {detailed && (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
            {update.lastCompleteSuccessAt && <span>{t("modelsUpdateComplete")} {time(update.lastCompleteSuccessAt)}</span>}
            {update.lastPublishedAt && <span>{t("modelsUpdatePublished")} {time(update.lastPublishedAt)}</span>}
          </div>
          {update.sources.length > 0 && (
            <ul className="space-y-2" aria-label={t("modelsUpdateSources")}>
              {update.sources.map((source) => (
                <li key={source.sourceId} className="break-words">
                  <span className="font-medium">{sourceNames[source.sourceId] ?? source.sourceId}</span>
                  {" · "}{t(`modelsUpdateSource_${source.status}`)}
                  {source.checkedAt && <> · {time(source.checkedAt)}</>}
                  {source.error && <p className="mt-1 whitespace-pre-wrap break-words">{source.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
