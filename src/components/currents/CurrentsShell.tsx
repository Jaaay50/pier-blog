"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * 潮汐 · Currents 统一产品外壳。
 * - 容器：自适应编辑工作台，max 1760px，与 Navbar / SiteFooter 同一轴线
 *   （宽度经由 --currents-shell-max CSS 变量共享）
 * - 桌面（≥xl / 1280px）：224px 粘性左侧栏 + 内容区（minmax(0,1fr)）
 * - 1024–1279px：不显示桌面侧栏，保留足够正文宽度
 * - 移动（<xl）：文字产品导航按钮「潮汐 · 当前页」+ AnimatePresence 展开面板
 * - 当前页高亮由 pathname + URL 视图参数（view/favorites）决定，
 *   指示器用 motion layoutId 在项间滑动，不做静态切换
 * - 站内导航全部走 TransitionLink（View Transitions 页面转场）
 */

interface NavItem {
  key: string;
  href: string;
}

const MAIN_NAV: NavItem[] = [
  { key: "featured", href: "/currents" },
  { key: "all", href: "/currents?view=all" },
  { key: "hot", href: "/currents/hot" },
  { key: "daily", href: "/currents/daily" },
  { key: "topics", href: "/currents/topics" },
  { key: "favorites", href: "/currents?view=all&favorites=1" },
  { key: "agent", href: "/currents/agent" },
];

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function SearchGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

function useCurrentKey(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname.startsWith("/currents/hot")) return "hot";
  if (pathname.startsWith("/currents/daily")) return "daily";
  if (pathname.startsWith("/currents/topics")) return "topics";
  if (pathname.startsWith("/currents/changelog")) return "changelog";
  if (pathname.startsWith("/currents/agent")) return "agent";
  if (pathname === "/currents") {
    // 首页三视图：favorites=1 → 收藏；view=all/papers → 全部动态；默认精选
    if (searchParams.get("favorites") === "1") return "favorites";
    const view = searchParams.get("view");
    if (view === "all" || view === "papers") return "all";
    return "featured";
  }
  // 详情页（/currents/[id]、/currents/events/[eventId]）不高亮任何项
  return "";
}

function NavList({
  currentKey,
  onNavigate,
  idPrefix,
}: {
  currentKey: string;
  onNavigate?: () => void;
  idPrefix: string;
}) {
  const t = useTranslations("currentsNav");

  const renderLink = (item: NavItem) => {
    const active = currentKey === item.key;
    return (
      <li key={item.key} className="relative">
        {active && (
          <motion.span
            layoutId={`${idPrefix}-indicator`}
            aria-hidden
            className="absolute inset-0 rounded-r-lg border-l-2 border-[var(--accent)] bg-[var(--accent-soft-block)]"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <TransitionLink
          id={`${idPrefix}-${item.key}`}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onNavigate={onNavigate}
          className={`relative -ml-px block rounded-r-lg py-2 pl-3 pr-2 text-sm transition-colors ${FOCUS_CLASS} ${
            active
              ? "font-medium text-[var(--accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t(item.key)}
        </TransitionLink>
      </li>
    );
  };

  const renderAuxLink = (item: NavItem) => {
    const active = currentKey === item.key;
    return (
      <li key={item.key}>
        <TransitionLink
          href={item.href}
          aria-current={active ? "page" : undefined}
          onNavigate={onNavigate}
          className={`block rounded-lg px-3 py-1.5 text-[13px] transition-colors ${FOCUS_CLASS} ${
            active
              ? "font-medium text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t(item.key)}
        </TransitionLink>
      </li>
    );
  };

  return (
    <>
      <ul className="space-y-0.5 border-l border-[var(--border)]">
        {MAIN_NAV.map(renderLink)}
      </ul>
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <ul className="space-y-0.5">
          <li>
            {/* 打开全站搜索：SearchModal 监听 window 的 "pier:open-search"
                CustomEvent 并调用 openModal */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("pier:open-search"));
                onNavigate?.();
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] ${FOCUS_CLASS}`}
            >
              <SearchGlyph />
              {t("search")}
            </button>
          </li>
          {renderAuxLink({ key: "changelog", href: "/currents/changelog" })}
          {renderAuxLink({ key: "feedback", href: "/feedback" })}
        </ul>
      </div>
    </>
  );
}

function CurrentsShellInner({ children }: { children: ReactNode }) {
  const t = useTranslations("currentsNav");
  const currentKey = useCurrentKey();
  const [panelOpen, setPanelOpen] = useState(false);
  const navButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const closePanel = () => setPanelOpen(false);

  // 路由 / 视图参数变化时关闭面板
  const [prevKey, setPrevKey] = useState(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setPanelOpen(false);
  }

  // Esc / 外部点击关闭 + 焦点管理：打开聚焦第一个链接，关闭焦点回到导航按钮
  useEffect(() => {
    if (!panelOpen) return;
    const navButton = navButtonRef.current;
    document.getElementById("currents-panel-nav-featured")?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !navButtonRef.current?.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      navButton?.focus();
    };
  }, [panelOpen]);

  return (
    <>
      {/* 移动端产品导航条（<xl）：「潮汐 · 当前页」文字按钮，chevron 指示展开态。
          不再是与全站菜单重复的第二个纯汉堡入口 */}
      <div className="relative border-b border-[var(--border)] px-4 py-2.5 xl:hidden">
        <button
          ref={navButtonRef}
          type="button"
          aria-expanded={panelOpen}
          aria-controls="currents-product-nav"
          onClick={() => setPanelOpen((v) => !v)}
          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${FOCUS_CLASS}`}
        >
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-display shrink-0 text-base font-semibold tracking-tight">
              {t("brand")}
            </span>
            {currentKey && (
              <span className="truncate text-sm text-[var(--text-secondary)]">
                · {t(currentKey)}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--text-muted)]">
            {panelOpen ? t("menuClose") : t("menuOpen")}
            <ChevronIcon open={panelOpen} />
          </span>
        </button>

        {/* 展开面板：复用 Navbar/SearchModal 的 AnimatePresence 语言 */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              ref={panelRef}
              id="currents-product-nav"
              role="dialog"
              aria-modal="false"
              aria-label={t("navLabel")}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.2, ease: "easeOut" }
              }
              className="absolute inset-x-2 top-full z-[70] mt-1 overflow-hidden rounded-xl border border-[var(--border)] currents-surface-sticky shadow-lg"
            >
              <nav aria-label={t("navLabel")} className="px-3 pb-4 pt-3">
                <NavList
                  currentKey={currentKey}
                  onNavigate={closePanel}
                  idPrefix="currents-panel-nav"
                />
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 容器：自适应编辑工作台（max 1760px，gutter 由 CSS 变量控制）。
          侧栏仅 ≥xl(1280px)；1024–1279px 保持全宽正文，不做 240px 断崖 */}
      <div className="currents-shell-container mx-auto w-full px-4 sm:px-6 lg:px-10">
        <div className="xl:grid xl:grid-cols-[224px_minmax(0,1fr)] xl:gap-8">
          <aside className="hidden xl:block">
            {/* top-20 = Navbar 实际高度（≈57px）+ 呼吸间距 */}
            <div className="sticky top-20 pb-10 pt-14">
              {/* 弱化品牌重复：小号 eyebrow 层级，与页面 H1 拉开视觉重量 */}
              <div className="mb-5 border-b border-[var(--border)] pb-4">
                <p className="text-[13px] font-semibold tracking-wide text-[var(--text-primary)]">
                  {t("brand")}
                  <span className="ml-1.5 font-normal text-[var(--text-muted)]">
                    {t("brandTagline")}
                  </span>
                </p>
              </div>
              <nav aria-label={t("navLabel")}>
                <NavList currentKey={currentKey} idPrefix="currents-side-nav" />
              </nav>
            </div>
          </aside>
          <div className="currents-content min-w-0">{children}</div>
        </div>
      </div>
    </>
  );
}

/**
 * 外壳导出：useSearchParams 需要 Suspense 边界，否则静态导出（SSG）
 * 的 9 个 Currents 页面构建时会报 CSR-bailout 警告/错误。
 */
export function CurrentsShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="currents-shell-container mx-auto w-full px-4 sm:px-6 lg:px-10">
          {children}
        </div>
      }
    >
      <CurrentsShellInner>{children}</CurrentsShellInner>
    </Suspense>
  );
}
