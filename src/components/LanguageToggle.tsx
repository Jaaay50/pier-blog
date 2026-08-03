"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useTransition } from "react";
import type { Locale } from "@/i18n/config";
import {
  armViewTransitionResolver,
  resolvePendingViewTransition,
} from "./TransitionLink";

export function LanguageToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("language");

  // 语言切换的转场结算：本组件在新 locale 路由 commit 后重渲染（locale 变化），
  // 与 TransitionLink 的结算监听互补——切换后的页面若无可渲染 TransitionLink
  // （如 404），这里兜底结算。
  useEffect(() => {
    resolvePendingViewTransition();
  }, [locale]);

  const handleToggle = () => {
    const nextLocale = locale === "en" ? "zh" : "en";

    const doReplace = () =>
      startTransition(() => {
        // URL 路由方案：同一路径切换 locale 前缀（/en/blog → /zh/blog）
        // next-intl middleware 会同步更新 NEXT_LOCALE cookie 供下次访问记住偏好
        // scroll: false：保持当前滚动位置（Next.js 默认导航后滚回顶部）
        router.replace(pathname, { locale: nextLocale, scroll: false });
      });

    // 支持 View Transitions 且非 reduced-motion：包交叉淡化遮罩，
    // 掩盖中英文内容 reflow + Navbar 文案宽度重排的裸跳。
    // 不污染 html.theme-transitioning——那是主题切换专用的 class，这里不触碰。
    if (
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // 上一个转场未结算先结算，避免 resolver 悬挂
      resolvePendingViewTransition();

      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            armViewTransitionResolver(resolve);
            doReplace();
          }),
      );

      // 慢导航保护：超时跳过动画并立即结算
      const timeout = window.setTimeout(() => {
        transition.skipTransition();
        resolvePendingViewTransition();
      }, 600);

      transition.finished
        .finally(() => window.clearTimeout(timeout))
        .catch(() => {});
      return;
    }

    doReplace();
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="group relative flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
      aria-label={t("switchTo")}
      title={t("switchTo")}
    >
      <svg
        className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      {/* 定宽文字：中 / EN 两字形下按钮总宽逐像素一致，不随切换胀缩 */}
      <span className="inline-block w-7 text-center font-medium text-[var(--text-primary)]">
        {locale === "en" ? "中" : "EN"}
      </span>
    </button>
  );
}
