"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { SearchModal } from "./SearchModal";
import { TransitionLink } from "./TransitionLink";
import { MagneticWrapper } from "./MagneticWrapper";
import { PierWordmark } from "./brand/PierWordmark";

/** 折叠菜单断点：实测 5 个入口 + 3 个控件在 1024px 溢出约 18px，1100px 以下折叠 */
const COLLAPSE_BREAKPOINT = 1100;

export function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/blog", label: t("blog") },
    { href: "/currents", label: t("currents") },
    { href: "/currents/hot", label: t("currentsHot") },
    { href: "/currents/topics", label: t("currentsTopics") },
    { href: "/portfolio", label: t("portfolio") },
    { href: "/lab", label: t("lab") },
    { href: "/about", label: t("about") },
  ];

  // 路由变化时关闭菜单（渲染期调整，避免 effect 瀑布渲染）
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  // 视口变宽（不再折叠）时关闭菜单，避免状态残留
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${COLLAPSE_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Esc 关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          <MagneticWrapper strength={0.2}>
            <TransitionLink
              href="/"
              aria-label="Pier"
              className="text-lg transition-opacity hover:opacity-90"
            >
              <PierWordmark />
            </TransitionLink>
          </MagneticWrapper>

          {/* 桌面链接：≥1100px */}
          <div className="hidden items-center gap-6 min-[1100px]:flex">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <span key={link.href} className="relative">
                  <TransitionLink
                    href={link.href}
                    className={`text-sm transition-colors ${
                      isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {link.label}
                  </TransitionLink>
                  {/* Phase 4：当前路由弹性下划线（layoutId 跨链接滑动）
                      key 绑定 locale：语言切换时下划线 remount 直接出现在新位置，
                      不做跨文案宽度的弹簧滑动；同 locale 页面间导航保留滑动 */}
                  {isActive && (
                    <motion.span
                      key={`${locale}-nav-underline`}
                      layoutId="nav-underline"
                      className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-[var(--accent)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </span>
              );
            })}
            <SearchModal />
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* 折叠态控件：<1100px。搜索/语言/主题保持可用，链接收进菜单 */}
          <div className="flex items-center gap-3 min-[1100px]:hidden">
            <SearchModal />
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t("menuClose") : t("menuOpen")}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {menuOpen ? (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 折叠菜单面板 */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden min-[1100px]:hidden"
            >
              <ul className="space-y-1 pb-2 pt-4">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <li key={link.href}>
                      <TransitionLink
                        href={link.href}
                        className={`block rounded-lg px-3 py-2.5 text-base transition-colors ${
                          isActive
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {link.label}
                      </TransitionLink>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
