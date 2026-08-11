"use client";

import { useEffect, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";

export interface AgentTocItem {
  id: string;
  label: string;
}

export interface AgentQuickLink {
  href: string;
  label: string;
  external?: boolean;
}

/**
 * Agent 接入页右侧栏：页内目录 + 快速入口。
 * - 目录项为原生锚点链接；IntersectionObserver 高亮当前阅读位置。
 * - 桌面端由页面侧 sticky 定位；窄屏由页面转为顶部紧凑横滚条。
 */
export function AgentToc({
  title,
  items,
  quickTitle,
  quickLinks,
}: {
  title: string;
  items: AgentTocItem[];
  quickTitle?: string;
  quickLinks?: AgentQuickLink[];
}) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    // Lenis 缓动滚动下 IntersectionObserver 的 active 带不可靠：
    // 改为 scroll 时选取「越过视口 30% 线的最后一个章节」。
    const update = () => {
      const line = window.innerHeight * 0.3;
      let current = items[0]?.id ?? "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      setActiveId(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  const linkClass = (active: boolean) =>
    `block rounded-md px-2 py-1 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
      active
        ? "bg-[var(--bg-card)] font-medium text-[var(--accent)]"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`;

  return (
    <>
      <nav aria-label={title}>
        <p className="mb-2 hidden px-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] min-[1280px]:block">
          {title}
        </p>
        <ul className="scrollbar-none flex gap-1 overflow-x-auto min-[1280px]:flex-col min-[1280px]:gap-0 min-[1280px]:overflow-visible">
          {items.map((item) => (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? "location" : undefined}
                className={linkClass(activeId === item.id)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {quickLinks && quickLinks.length > 0 && (
        <div className="mt-6 hidden border-t border-[var(--border)] pt-4 min-[1280px]:block">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {quickTitle}
          </p>
          <ul className="space-y-0.5">
            {quickLinks.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a
                    href={link.href}
                    className="block rounded-md px-2 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <TransitionLink
                    href={link.href}
                    className="block rounded-md px-2 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    {link.label}
                  </TransitionLink>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
