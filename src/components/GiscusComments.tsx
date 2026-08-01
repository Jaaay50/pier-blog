"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";

const THEME_BASE = "https://ethanpier.com";

/**
 * Giscus 留言區 — GitHub Discussions 驅動，零後端。
 * 主題使用自定義 CSS（/giscus-light.css / /giscus-dark.css），
 * 完全匹配博客設計系統（Ivory/Clay 淺色、DeepSpace/TechBlue 深色）。
 */
export function GiscusComments() {
  const { resolvedTheme } = useTheme();
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.innerHTML = "";

    const themeUrl =
      resolvedTheme === "dark"
        ? `${THEME_BASE}/giscus-dark.css`
        : `${THEME_BASE}/giscus-light.css`;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "Jaaay50/pier-blog");
    script.setAttribute("data-repo-id", "R_kgDOTml4tA");
    script.setAttribute("data-category", "Announcements");
    script.setAttribute("data-category-id", "DIC_kwDOTml4tM4DCbav");
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "0");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", themeUrl);
    script.setAttribute("data-lang", locale === "zh" ? "zh-CN" : "en");
    script.setAttribute("data-loading", "lazy");
    script.crossOrigin = "anonymous";
    script.async = true;

    ref.current.appendChild(script);
  }, [resolvedTheme, locale]);

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {/* 分隔線 */}
        <div className="mb-10 h-px bg-[var(--border)]" />

        <h2 className="mb-8 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {locale === "zh" ? "留言" : "Comments"}
        </h2>

        {/* Giscus 容器：與頁面融合的 card 底座 */}
        <div
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
          style={{ minHeight: 120 }}
        >
          <div ref={ref} className="p-1" />
        </div>
      </div>
    </section>
  );
}
