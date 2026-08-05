"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 惰性初始化需要给 useState 传函数引用而非内联调用（react-hooks 规则）
const getIsClient = () => typeof window !== "undefined";

const CATEGORY_KEYS = [
  "all",
  "models",
  "products",
  "industry",
  "papers",
  "tutorials",
  "opinions",
  "opensource",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

interface CurrentsFiltersProps {
  category: CategoryKey;
  onCategoryChange: (c: CategoryKey) => void;
  query: string;
  onQueryChange: (q: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (v: boolean) => void;
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.6l2.5 5.1 5.6.8-4.05 3.95.96 5.58L12 16.4l-5.01 2.63.96-5.58L3.9 9.5l5.6-.8L12 3.6z" />
    </svg>
  );
}

/**
 * Sticky toolbar：分类 segmented tabs + 搜索 + 收藏开关（方案 13.5）。
 * 搜索防抖在父组件处理，这里只做受控输入。
 */
export function CurrentsFilters({
  category,
  onCategoryChange,
  query,
  onQueryChange,
  favoritesOnly,
  onFavoritesOnlyChange,
}: CurrentsFiltersProps) {
  const t = useTranslations("currents");
  // 水合前（无 JS 首帧）直接用 URL query 渲染输入框，避免闪烁
  const [inputValue, setInputValue] = useState(() =>
    getIsClient() ? query : "",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部（URL 恢复 / 语言切换）query 变化时同步输入框（render 期调整，非 effect）
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
      <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* 分类 segmented tabs：横向滚动防 390px 溢出 */}
        <div
          role="tablist"
          aria-label={t("categoriesLabel")}
          className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 py-0.5"
        >
          {CATEGORY_KEYS.map((key) => {
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
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

        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1 lg:w-64 lg:flex-none">
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
  );
}
