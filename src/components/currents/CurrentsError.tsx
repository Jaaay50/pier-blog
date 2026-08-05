"use client";

import { useTranslations } from "next-intl";

interface CurrentsErrorProps {
  onRetry: () => void;
  /** 是否为「加载更多」失败（内联、轻量呈现） */
  inline?: boolean;
}

/** 加载失败态：网络断开 / 5xx / 慢请求超时统一入口，附重试 */
export function CurrentsError({ onRetry, inline }: CurrentsErrorProps) {
  const t = useTranslations("currents");

  if (inline) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-sm text-[var(--text-muted)]">
        <p>{t("loadMoreError")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm text-[var(--text-muted)]">{t("errorLoad")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
      >
        {t("retry")}
      </button>
    </div>
  );
}
