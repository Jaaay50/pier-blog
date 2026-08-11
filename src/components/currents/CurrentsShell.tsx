"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

/**
 * 潮汐 · Currents 统一产品外壳。
 * - 桌面（≥lg）：240px（xl 起 264px）粘性左侧栏 + 内容区
 * - 移动（<lg）：紧凑入口条 + 左侧滑入抽屉
 * - 当前页高亮由 pathname + URL 视图参数（view/favorites）决定
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

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
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
      <li key={item.key}>
        <Link
          id={`${idPrefix}-${item.key}`}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={`relative -ml-px block rounded-r-lg py-2 pl-3 pr-2 text-sm transition-colors ${FOCUS_CLASS} ${
            active
              ? "border-l-2 border-[var(--accent)] bg-[var(--accent-soft-block)] font-medium text-[var(--accent)]"
              : "border-l-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t(item.key)}
        </Link>
      </li>
    );
  };

  const renderAuxLink = (item: NavItem) => {
    const active = currentKey === item.key;
    return (
      <li key={item.key}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={`block rounded-lg px-3 py-1.5 text-[13px] transition-colors ${FOCUS_CLASS} ${
            active
              ? "font-medium text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          {t(item.key)}
        </Link>
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
            {/* 打开全站搜索：SearchModal 由另一代理改动，会监听
                window 的 "pier:open-search" CustomEvent 并调用 openModal */}
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => setDrawerOpen(false);

  // 路由 / 视图参数变化时关闭抽屉
  const [prevKey, setPrevKey] = useState(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setDrawerOpen(false);
  }

  // Esc 关闭 + 焦点管理：打开聚焦第一个链接，关闭焦点回到菜单按钮
  useEffect(() => {
    if (!drawerOpen) return;
    const menuButton = menuButtonRef.current;
    document.getElementById("currents-drawer-nav-featured")?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [drawerOpen]);

  return (
    <>
      {/* 移动端入口条（<lg）：品牌 + 当前页名 + 菜单按钮 */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-display shrink-0 text-base font-semibold tracking-tight">
            {t("brand")}
          </span>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">
            {t("brandTagline")}
          </span>
          {currentKey && (
            <span className="truncate text-xs text-[var(--text-secondary)]">
              · {t(currentKey)}
            </span>
          )}
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={drawerOpen}
          aria-controls="currents-drawer"
          aria-label={t("menuOpen")}
          onClick={() => setDrawerOpen(true)}
          className={`inline-flex shrink-0 items-center justify-center rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] ${FOCUS_CLASS}`}
        >
          <MenuIcon />
        </button>
      </div>

      {/* 移动端抽屉：左侧滑入（reduced-motion 下无动画） */}
      {drawerOpen && (
        <div id="currents-drawer" className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 motion-safe:animate-[currents-fade-in_150ms_ease-out]"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("brand")}
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-primary)] px-4 pb-6 pt-4 motion-safe:animate-[currents-slide-in_200ms_ease-out]"
          >
            <div className="mb-5 flex items-start justify-between gap-2 border-b border-[var(--border)] pb-4">
              <div>
                <p className="font-display text-lg font-semibold tracking-tight">
                  {t("brand")}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t("brandTagline")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("menuClose")}
                onClick={closeDrawer}
                className={`inline-flex items-center justify-center rounded-full p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] ${FOCUS_CLASS}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav aria-label={t("navLabel")}>
              <NavList currentKey={currentKey} onNavigate={closeDrawer} idPrefix="currents-drawer-nav" />
            </nav>
          </div>
        </div>
      )}

      {/* 桌面网格：粘性侧栏 + 内容区 */}
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[264px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            {/* top-16 对齐 Navbar 高度（py-4 + 单行 ≈ 56px）+ 呼吸间距 */}
            <div className="sticky top-16 pb-10 pt-14">
              <div className="mb-6 border-b border-[var(--border)] pb-5">
                <p className="font-display text-lg font-semibold tracking-tight">
                  {t("brand")}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t("brandTagline")}
                </p>
              </div>
              <nav aria-label={t("navLabel")}>
                <NavList currentKey={currentKey} idPrefix="currents-side-nav" />
              </nav>
            </div>
          </aside>
          <div className="min-w-0">{children}</div>
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
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      }
    >
      <CurrentsShellInner>{children}</CurrentsShellInner>
    </Suspense>
  );
}
