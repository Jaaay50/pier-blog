"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { getLenis } from "@/lib/animations/lenis";
import type { Heading } from "@/components/MDXContent";

interface TableOfContentsProps {
  headings: Heading[];
  labels?: {
    toc: string;
    open: string;
    close: string;
  };
}

/**
 * 文章目录（TOC）：
 * - 桌面端右侧 sticky，呈现为轻量编辑目录（细导轨 + 当前项指示条），不做整块卡片
 * - 移动端点按钮展开为抽屉，抽屉才使用卡片材质
 * - 滚动监听高亮当前章节
 */
export function TableOfContents({ headings, labels }: TableOfContentsProps) {
  const tocLabel = labels?.toc ?? "Table of Contents";
  const openLabel = labels?.open ?? "Toggle table of contents";
  const closeLabel = labels?.close ?? "Close table of contents";
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    headingElements.forEach((el) => observer.observe(el));

    return () => {
      headingElements.forEach((el) => observer.unobserve(el));
    };
  }, [headings]);

  // 抽屉打开时锁滚动，避免移动端背景跟随滚动
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // 打开后把焦点带入抽屉，并限制 Tab 在抽屉内循环；关闭后还原触发按钮。
  useEffect(() => {
    if (!isOpen) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }

    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;

      const focusables = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (headings.length === 0) return null;

  const desktopHeadingId = "article-toc-heading-desktop";
  const mobileHeadingId = "article-toc-heading-mobile";

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // 优先用 Lenis 平滑滚动（带 easing）；减弱动效或无 Lenis 时直接跳转
    const lenis = getLenis();
    if (lenis && !prefersReducedMotion) {
      lenis.scrollTo(el, { offset: -96, duration: 1 });
    } else {
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
    setIsOpen(false);
  };

  const openDrawer = () => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
  };

  const items = (
    <ul className="toc-list">
      {headings.map((heading) => {
        const isActive = activeId === heading.id;
        return (
          <li key={heading.id} className="relative">
            {/* 当前项指示条：layoutId 共享实现滑动；减弱动效下瞬时切换 */}
            {isActive && (
              <motion.span
                layoutId="toc-active"
                aria-hidden="true"
                className="absolute bottom-[0.3rem] left-0 top-[0.3rem] w-[2px] rounded-full bg-[var(--accent)]"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 28 }
                }
              />
            )}
            <button
              onClick={() => handleClick(heading.id)}
              aria-current={isActive ? "location" : undefined}
              className={`block w-full py-1 pr-1 text-left text-[13px] leading-snug transition-colors ${
                heading.level === 3 ? "pl-6" : "pl-3.5"
              } ${
                isActive
                  ? "font-medium text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {heading.text}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* 移动端展开按钮：贴右下、尊重安全区，尺寸收小以少压正文 */}
      <button
        onClick={openDrawer}
        className="toc-fab lg:hidden"
        aria-label={openLabel}
        aria-expanded={isOpen}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h11M4 18h7" />
        </svg>
      </button>

      {/* 移动端遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 桌面端：轻量导轨，无卡片、无玻璃、无阴影 */}
      <nav className="toc-rail hidden lg:block" aria-labelledby={desktopHeadingId}>
        <h2
          id={desktopHeadingId}
          className="mb-3 pl-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
        >
          {tocLabel}
        </h2>
        {items}
      </nav>

      {/* 移动端：抽屉（卡片材质仅用于浮层）。关闭时 inert + aria-hidden，
          避免与桌面导轨产生重复可访问名称。 */}
      <aside
        ref={drawerRef}
        className={`toc-drawer lg:hidden ${isOpen ? "is-open" : ""}`}
        aria-labelledby={mobileHeadingId}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex items-center justify-between pb-3 pl-3.5">
          <h2
            id={mobileHeadingId}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
          >
            {tocLabel}
          </h2>
          <button
            ref={closeRef}
            onClick={() => setIsOpen(false)}
            aria-label={closeLabel}
            className="-mr-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {items}
      </aside>
    </>
  );
}
