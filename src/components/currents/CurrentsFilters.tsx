"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CurrentsSource } from "@/lib/currents/types";

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
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.6l2.5 5.1 5.6.8-4.05 3.95.96 5.58L12 16.4l-5.01 2.63.96-5.58L3.9 9.5l5.6-.8L12 3.6z" />
    </svg>
  );
}

const VIEW_LABEL_KEY: Record<ViewKey, string> = {
  selected: "viewSelected",
  all: "viewAll",
  papers: "viewPapers",
};

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
}: CurrentsFiltersProps) {
  const t = useTranslations("currents");
  const [inputValue, setInputValue] = useState(() => (getIsClient() ? query : ""));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleInput = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQueryChange(value.trim());
    }, 400);
  };

  return (
    <div className="sticky top-[65px] z-30 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 px-6 py-3 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl">
        {/* 顶层视图：精选 | 全部动态 | 论文 */}
        <div role="tablist" aria-label="view" className="mb-3 flex gap-1">
          {VIEW_KEYS.map((key) => {
            const active = view === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-[var(--accent)]/60 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t(VIEW_LABEL_KEY[key])}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* 二级分类（papers 视图下隐藏） */}
          {view !== "papers" && (
            <div role="tablist" aria-label={t("categoriesLabel")} className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 py-0.5">
              {SECONDARY_CATEGORY_KEYS.map((key) => {
                const active = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onCategoryChange(key)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[13px] transition-colors ${
                      active
                        ? "border-[var(--accent)]/60 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {/* 搜索框 */}
            <div className="relative flex-1 lg:w-56 lg:flex-none">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={inputValue}
                onChange={(e) => handleInput(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="w-full rounded-full border border-[var(--border)] bg-[var(--bg-card)] py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-hover)] focus:outline-none"
              />
            </div>

            {/* 来源下拉 */}
            <select
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              aria-label={t("sourceFilter")}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-hover)] focus:outline-none"
            >
              <option value="">{t("allSources")}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameZh ?? s.name}
                </option>
              ))}
            </select>

            {/* 最低评分 */}
            <select
              value={minScore}
              onChange={(e) => onMinScoreChange(e.target.value)}
              aria-label={t("minScore")}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--border-hover)] focus:outline-none"
            >
              <option value="">{t("minScore")}</option>
              <option value="80">80+</option>
              <option value="65">65+</option>
              <option value="50">50+</option>
              <option value="0">0+</option>
            </select>

            {/* 收藏开关 */}
            <button
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                favoritesOnly
                  ? "border-[var(--accent)]/60 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <StarIcon filled={favoritesOnly} />
              {t("favoritesOnly")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
