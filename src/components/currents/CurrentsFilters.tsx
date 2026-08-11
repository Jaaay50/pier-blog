"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CurrentsSource } from "@/lib/currents/types";
import { setDensity, type Density } from "@/lib/currents/density";

// 惰性初始化需要给 useState 传函数引用而非内联调用（react-hooks 规则）
const getIsClient = () => typeof window !== "undefined";

const VIEW_KEYS = ["selected", "all", "papers"] as const;
export type ViewKey = (typeof VIEW_KEYS)[number];

const SECONDARY_CATEGORY_KEYS = [
  "all",
  "models",
  "products",
  "industry",
  "tutorials",
  "opinions",
  "opensource",
] as const;
export type CategoryKey = (typeof SECONDARY_CATEGORY_KEYS)[number] | "papers";

interface CurrentsFiltersProps {
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  category: CategoryKey;
  onCategoryChange: (c: CategoryKey) => void;
  query: string;
  onQueryChange: (q: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (v: boolean) => void;
  sources: CurrentsSource[];
  source: string;
  onSourceChange: (s: string) => void;
  minScore: string;
  onMinScoreChange: (v: string) => void;
  density: Density;
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.6l2.5 5.1 5.6.8-4.05 3.95.96 5.58L12 16.4l-5.01 2.63.96-5.58L3.9 9.5l5.6-.8L12 3.6z" />
    </svg>
  );
}

function DensityIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function FilterGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

const DENSITY_KEYS: Density[] = ["compact", "standard", "comfortable"];

const DENSITY_LABEL_KEY: Record<Density, string> = {
  compact: "densityCompact",
  standard: "densityStandard",
  comfortable: "densityComfortable",
};

const VIEW_LABEL_KEY: Record<ViewKey, string> = {
  selected: "viewSelected",
  all: "viewAll",
  papers: "viewPapers",
};

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

const PILL_BASE =
  "rounded-full border px-3 py-1 text-[13px] transition-colors";
const PILL_ACTIVE = "border-[var(--accent)]/60 text-[var(--accent)]";
const PILL_IDLE =
  "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function CurrentsFilters({
  view,
  onViewChange,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  sources,
  source,
  onSourceChange,
  minScore,
  onMinScoreChange,
  density,
}: CurrentsFiltersProps) {
  const t = useTranslations("currents");
  const reducedMotion = useReducedMotion();
  const [inputValue, setInputValue] = useState(() => (getIsClient() ? query : ""));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 桌面收缩状态：滚动越过筛选区后收起为单行工具栏
  const [collapsed, setCollapsed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 移动端底部筛选面板
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetButtonRef = useRef<HTMLButtonElement>(null);
  const sheetLayerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // 桌面收缩态「更多筛选」展开行
  const [moreOpen, setMoreOpen] = useState(false);

  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setInputValue(query);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 收缩检测以实际 Navbar 高度为基准；Navbar 尺寸变化时重建观察器。
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    let observer: IntersectionObserver | null = null;
    const observe = () => {
      observer?.disconnect();
      const rawHeight = getComputedStyle(document.documentElement)
        .getPropertyValue("--site-nav-height")
        .trim();
      const navbarHeight = Number.parseFloat(rawHeight) || 57;
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setCollapsed(!entry.isIntersecting);
        },
        { rootMargin: `-${navbarHeight}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(sentinel);
    };

    observe();
    const navbar = document.querySelector<HTMLElement>("[data-site-navbar]");
    if (!navbar || typeof ResizeObserver === "undefined") {
      return () => observer?.disconnect();
    }

    const resizeObserver = new ResizeObserver(observe);
    resizeObserver.observe(navbar);
    return () => {
      observer?.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  // 底部面板是完整模态：锁滚动、隔离背景、圈住焦点，并在关闭后恢复触发点。
  useEffect(() => {
    if (!sheetOpen) return;

    const trigger = sheetButtonRef.current;
    const layer = sheetLayerRef.current;
    const sheet = sheetRef.current;
    if (!layer || !sheet) return;

    const focusable = () =>
      Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true",
      );

    // 先把焦点移入面板，再隔离触发按钮所在背景，避免 aria-hidden 拒绝生效。
    const first = focusable()[0];
    (first ?? sheet).focus();

    const isolated: Array<{
      element: HTMLElement;
      inert: boolean;
      ariaHidden: string | null;
    }> = [];
    let branch: HTMLElement = layer;
    while (branch.parentElement && branch.parentElement !== document.body) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
        isolated.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute("aria-hidden"),
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }
      branch = branch.parentElement;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSheetOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const elements = focusable();
      if (elements.length === 0) {
        e.preventDefault();
        sheet.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!sheet.contains(e.target as Node)) {
        (focusable()[0] ?? sheet).focus();
      }
    };

    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const onDesktopChange = (e: MediaQueryListEvent) => {
      if (e.matches) setSheetOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    desktopQuery.addEventListener("change", onDesktopChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      desktopQuery.removeEventListener("change", onDesktopChange);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      for (const { element, inert, ariaHidden } of isolated) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      if (trigger?.isConnected) trigger.focus();
    };
  }, [sheetOpen]);

  // 回到展开态（回到顶部）时自动收起「更多筛选」行（渲染期调整，避免 effect 瀑布）
  const [prevCollapsed, setPrevCollapsed] = useState(collapsed);
  if (prevCollapsed !== collapsed) {
    setPrevCollapsed(collapsed);
    if (!collapsed) setMoreOpen(false);
  }

  const handleInput = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(value.trim());
    }, 400);
  };

  // 活跃筛选计数（移动端吸顶状态展示）
  const activeFilterCount =
    (category !== "all" && view !== "papers" ? 1 : 0) +
    (query ? 1 : 0) +
    (source ? 1 : 0) +
    (minScore ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  const viewLabel = t(VIEW_LABEL_KEY[view]);

  const searchInput = (fullWidth: boolean) => (
    <div className={`relative ${fullWidth ? "w-full" : "w-full sm:w-48"}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className={`w-full rounded-full border border-[var(--border)] bg-[var(--bg-card)] py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-hover)] focus:outline-none ${FOCUS_CLASS}`}
      />
    </div>
  );

  const sourceSelect = (
    <select
      value={source}
      onChange={(e) => onSourceChange(e.target.value)}
      aria-label={t("sourceFilter")}
      className={`rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-hover)] focus:outline-none ${FOCUS_CLASS}`}
    >
      <option value="">{t("allSources")}</option>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nameZh ?? s.name}
        </option>
      ))}
    </select>
  );

  const minScoreSelect = (
    <select
      value={minScore}
      onChange={(e) => onMinScoreChange(e.target.value)}
      aria-label={t("minScore")}
      className={`rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-hover)] focus:outline-none ${FOCUS_CLASS}`}
    >
      <option value="">{t("minScore")}</option>
      <option value="80">80+</option>
      <option value="65">65+</option>
      <option value="50">50+</option>
      <option value="0">0+</option>
    </select>
  );

  const densityGroup = (
    <div
      role="group"
      aria-label={t("densityLabel")}
      className="flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] p-0.5"
    >
      <span className="pl-2 pr-1 text-[var(--text-muted)]" aria-hidden>
        <DensityIcon />
      </span>
      {DENSITY_KEYS.map((key) => {
        const active = density === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            title={t(DENSITY_LABEL_KEY[key])}
            onClick={() => setDensity(key)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              active
                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            } ${FOCUS_CLASS}`}
          >
            {t(DENSITY_LABEL_KEY[key])}
          </button>
        );
      })}
    </div>
  );

  const favoritesToggle = (
    <button
      type="button"
      aria-pressed={favoritesOnly}
      onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        favoritesOnly ? PILL_ACTIVE : PILL_IDLE
      } ${FOCUS_CLASS}`}
    >
      <StarIcon filled={favoritesOnly} />
      {t("favoritesOnly")}
    </button>
  );

  return (
    <>
      {/* 收缩哨兵：位于筛选区上方，越过即进入吸顶收缩态 */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {/* ===== 移动端吸顶极简栏（<xl）：当前视图 + 筛选状态 + 筛选按钮 ===== */}
      <div className="currents-surface-sticky sticky top-[var(--site-nav-height)] z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] xl:hidden">
        <span className="flex min-w-0 items-baseline gap-2 text-sm">
          <span className="shrink-0 font-medium">{viewLabel}</span>
          {activeFilterCount > 0 && (
            <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              {t("activeFilters", { count: activeFilterCount })}
            </span>
          )}
        </span>
        <button
          ref={sheetButtonRef}
          type="button"
          aria-expanded={sheetOpen}
          aria-controls="currents-filter-sheet"
          onClick={() => setSheetOpen(true)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] ${FOCUS_CLASS}`}
        >
          <FilterGlyph />
          {t("filtersOpen")}
        </button>
      </div>

      {/* ===== 移动端底部筛选面板（<xl） ===== */}
      <AnimatePresence>
        {sheetOpen && (
          <div ref={sheetLayerRef} className="fixed inset-0 z-[80] xl:hidden">
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              ref={sheetRef}
              id="currents-filter-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={t("filtersOpen")}
              tabIndex={-1}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 38 }
              }
              className="currents-surface-sticky absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border)] px-5 pb-8 pt-4"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-hover)]" aria-hidden />
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">{t("filtersOpen")}</p>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className={`rounded-full px-3 py-1 text-sm text-[var(--accent)] ${FOCUS_CLASS}`}
                >
                  {t("close")}
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {/* 视图 */}
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                    {t("categoriesLabel")}
                  </p>
                  <div role="tablist" aria-label="view" className="flex flex-wrap gap-1.5">
                    {VIEW_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={view === key}
                        onClick={() => onViewChange(key)}
                        className={`${PILL_BASE} ${view === key ? PILL_ACTIVE : PILL_IDLE} ${FOCUS_CLASS}`}
                      >
                        {t(VIEW_LABEL_KEY[key])}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 分类：换行显示，不再隐藏滚动条只露半项 */}
                {view !== "papers" && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                      {t("categoriesLabel")}
                    </p>
                    <div
                      role="tablist"
                      aria-label={t("categoriesLabel")}
                      className="flex flex-wrap gap-1.5"
                    >
                      {SECONDARY_CATEGORY_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={category === key}
                          onClick={() => onCategoryChange(key)}
                          className={`${PILL_BASE} ${category === key ? PILL_ACTIVE : PILL_IDLE} ${FOCUS_CLASS}`}
                        >
                          {t(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 搜索：占完整可用宽度 */}
                {searchInput(true)}

                {/* 来源 + 最低评分：稳定两列 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                    {t("sourceFilter")}
                    {sourceSelect}
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                    {t("minScore")}
                    {minScoreSelect}
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {densityGroup}
                  {favoritesToggle}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== 桌面筛选区（≥xl）：初始融入背景，滚动后收缩为单行工具栏 ===== */}
      <motion.div
        layout
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 320, damping: 34 }
        }
        className={`sticky top-[var(--site-nav-height)] z-30 hidden xl:block ${
          collapsed
            ? "currents-surface-sticky rounded-xl border border-[var(--border)] px-4 py-2.5 shadow-[var(--currents-shadow-sticky)]"
            : "border-b border-transparent py-3"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            /* 收缩态：单行工具栏（≈52–60px），低频项收进展开行 */
            <motion.div
              key="collapsed"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-2.5"
            >
              <div role="tablist" aria-label="view" className="flex shrink-0 gap-1">
                {VIEW_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => onViewChange(key)}
                    className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                      view === key ? PILL_ACTIVE : PILL_IDLE
                    } ${FOCUS_CLASS}`}
                  >
                    {t(VIEW_LABEL_KEY[key])}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">{searchInput(false)}</div>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition-colors ${
                  activeFilterCount > 0 ? PILL_ACTIVE : PILL_IDLE
                } ${FOCUS_CLASS}`}
              >
                <FilterGlyph />
                {t("moreFilters")}
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[var(--accent-soft)] px-1.5 text-[11px] font-medium text-[var(--accent)]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {favoritesToggle}
            </motion.div>
          ) : (
            /* 展开态：完整筛选，融入页面背景（无白框） */
            <motion.div
              key="expanded"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <div role="tablist" aria-label="view" className="mb-3 flex gap-1">
                {VIEW_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => onViewChange(key)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      view === key ? PILL_ACTIVE : PILL_IDLE
                    } ${FOCUS_CLASS}`}
                  >
                    {t(VIEW_LABEL_KEY[key])}
                  </button>
                ))}
              </div>

              <div className="flex flex-row flex-wrap items-center gap-2.5">
                {view !== "papers" && (
                  <div
                    role="tablist"
                    aria-label={t("categoriesLabel")}
                    className="flex flex-wrap gap-1"
                  >
                    {SECONDARY_CATEGORY_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={category === key}
                        onClick={() => onCategoryChange(key)}
                        className={`${PILL_BASE} ${category === key ? PILL_ACTIVE : PILL_IDLE} ${FOCUS_CLASS}`}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2.5">
                  {searchInput(false)}
                  {sourceSelect}
                  {minScoreSelect}
                  {densityGroup}
                  {favoritesToggle}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ===== 桌面收缩态「更多筛选」展开行（xl+，原位展开，非底部面板） ===== */}
      <AnimatePresence>
        {moreOpen && collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: "easeOut" }
            }
            className="currents-surface-sticky sticky top-[calc(var(--site-nav-height)+4.25rem)] z-20 hidden overflow-hidden rounded-xl border border-[var(--border)] px-4 xl:block"
          >
            <div className="flex flex-wrap items-center gap-2.5 py-3">
              {view !== "papers" && (
                <div
                  role="tablist"
                  aria-label={t("categoriesLabel")}
                  className="flex flex-wrap gap-1"
                >
                  {SECONDARY_CATEGORY_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={category === key}
                      onClick={() => onCategoryChange(key)}
                      className={`${PILL_BASE} ${category === key ? PILL_ACTIVE : PILL_IDLE} ${FOCUS_CLASS}`}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              )}
              {sourceSelect}
              {minScoreSelect}
              {densityGroup}
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className={`ml-auto rounded-full px-3 py-1 text-[13px] text-[var(--accent)] ${FOCUS_CLASS}`}
              >
                {t("close")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
