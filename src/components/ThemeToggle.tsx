"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useRef, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const buttonRef = useRef<HTMLButtonElement>(null);
  // true on client after hydration, false during SSR — no effect needed.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button className="h-8 w-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]" />
    );
  }

  const nextTheme = theme === "dark" ? "light" : "dark";
  const ariaLabel = nextTheme === "dark" ? t("toDark") : t("toLight");

  /**
   * Phase 4：主题切换圆形扩散过渡。
   * 用 View Transitions API 截帧，新主题从按钮中心 clip-path 圆形扩散。
   * 降级：不支持 / prefers-reduced-motion 时直接切换。
   */
  const handleToggle = () => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!document.startViewTransition || reduced) {
      setTheme(nextTheme);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // 标记切换中：禁用默认 fade，改由下方 clip-path 接管
    document.documentElement.classList.add("theme-transitioning");

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transitioning");
    });
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      className="group relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]"
      aria-label={ariaLabel}
    >
      {/* Sun */}
      <svg
        className={`h-4 w-4 transition-all ${
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
      {/* Moon */}
      <svg
        className={`absolute h-4 w-4 transition-all ${
          theme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
