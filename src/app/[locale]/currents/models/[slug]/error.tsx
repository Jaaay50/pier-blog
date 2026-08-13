"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * 模型详情页可重试错误态。
 * 只有后端明确 404 才走 not-found；5xx / 429 / 超时 / 网络失败 / 非法 JSON / 契约异常
 * 落到本边界——绝不被 ISR 缓存为 404。reset() 重新渲染该路由段。
 */
export default function CurrentsModelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("currents");
  useEffect(() => {
    console.error("[currents] model detail page error:", error);
  }, [error]);

  return (
    <main className="relative min-h-screen">
      <Navbar />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 pb-14 pt-40 text-center">
        <p className="text-sm text-[var(--text-muted)]">{t("errorLoad")}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        >
          {t("retry")}
        </button>
      </div>
      <SiteFooter maxWidth="max-w-6xl" />
    </main>
  );
}
