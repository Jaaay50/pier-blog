"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getLenis } from "@/lib/animations/lenis";
import type { Heading } from "@/components/MDXContent";

interface TableOfContentsProps {
  headings: Heading[];
}

/**
 * 文章目录（TOC）：
 * - 桌面端右侧悬浮
 * - 移动端点按钮展开
 * - 滚动监听高亮当前章节
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

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

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Phase 4：优先用 Lenis 平滑滚动（带 easing），降级原生 smooth
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(el, { offset: -96, duration: 1 });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* 移动端展开按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] shadow-lg backdrop-blur-sm transition-all hover:border-[var(--border-hover)] lg:hidden"
        aria-label="Toggle table of contents"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[var(--text-primary)]"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* 移动端遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* TOC 面板 */}
      <aside
        className={`fixed right-0 top-20 z-50 h-[calc(100vh-5rem)] w-64 transform overflow-y-auto transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="rounded-l-xl border border-r-0 border-[var(--border)] bg-[var(--bg-card)]/95 p-4 backdrop-blur-md lg:border-r lg:rounded-xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            On This Page
          </h2>
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className="relative"
                style={{
                  paddingLeft: heading.level === 3 ? "1rem" : "0",
                }}
              >
                {/* Phase 4：果冻高亮背景，layoutId 共享实现弹性滑动 */}
                {activeId === heading.id && (
                  <motion.span
                    layoutId="toc-active"
                    className="absolute inset-0 rounded-md bg-[var(--accent-soft)]"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 28,
                    }}
                  />
                )}
                <button
                  onClick={() => handleClick(heading.id)}
                  className={`relative block w-full rounded-md px-2 py-1 text-left text-sm transition-colors ${
                    activeId === heading.id
                      ? "font-medium text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
