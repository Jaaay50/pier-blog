"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * 日报（/currents/daily 与 /currents/daily/[date]）可重试错误态。
 * 只有后端明确 404 才走 not-found；5xx / 429 / 超时 / 网络失败 / 非法 JSON
 * 都会抛出并落到本边界——绝不被 ISR 缓存为 404。reset() 重新渲染该路由段。
 */
export default function CurrentsDailyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("currents");
  useEffect(() => {
    console.error("[currents] daily page error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <p className="text-sm text-[var(--text-muted)]">{t("errorLoad")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {t("retry")}
      </button>
    </div>
  );
}
