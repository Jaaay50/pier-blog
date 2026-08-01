"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/**
 * Giscus 留言組件 — GitHub Discussions 驅動，零後端。
 * Repo: Jaaay50/pier-blog  (需在 GitHub 開啟 Discussions 並安裝 giscus app)
 * 主題跟隨當前深/淺色模式自動切換。
 */
export function GiscusComments() {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // 清除舊實例（主題切換時重建）
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "Jaaay50/pier-blog");
    script.setAttribute("data-repo-id", "R_kgDOTml4tA");
    script.setAttribute("data-category", "Announcements");
    script.setAttribute("data-category-id", "DIC_kwDOTml4tM4DCbav");
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute(
      "data-theme",
      resolvedTheme === "dark" ? "dark_dimmed" : "light"
    );
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");
    script.crossOrigin = "anonymous";
    script.async = true;

    ref.current.appendChild(script);
  }, [resolvedTheme]);

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          留言
        </h2>
        <div ref={ref} />
      </div>
    </section>
  );
}
