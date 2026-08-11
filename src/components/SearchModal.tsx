"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import type { FlexIndexLike, SearchDoc, SearchDocType } from "@/lib/search";
import { rankResults } from "@/lib/search";

const HISTORY_KEY = "pier-search-history";
const HISTORY_MAX = 5;

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(term: string) {
  const list = [term, ...loadHistory().filter((t) => t !== term)].slice(
    0,
    HISTORY_MAX
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

/** 关键词高亮：大小写不敏感分段包裹 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-[var(--accent-soft)] px-0.5 text-[var(--accent)]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * 全站搜索模态框。
 * - Cmd/Ctrl+K 唤起，Esc 关闭；监听 "pier:open-search" 自定义事件（Currents 侧栏入口）
 * - FlexSearch 客户端索引（懒加载 /api/search-index），召回后用 rankResults 重排
 * - 覆盖博客 + 功能页 + 主题页；标题/描述/标签/keywords/正文联合搜索，结果高亮 + 类型徽章
 * - 键盘导航（↑↓ + Enter）、最近搜索（localStorage）、加载与失败状态
 * - reduced-motion 无动画
 */
export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [selected, setSelected] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const indexRef = useRef<FlexIndexLike | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("search");

  /** 打开入口：事件处理器内同步读历史（避免 effect 内 setState） */
  const openModal = useCallback(() => {
    setHistory(loadHistory());
    setOpen(true);
  }, []);

  /* 快捷键：Cmd/Ctrl+K 唤起，Esc 关闭；外部 "pier:open-search" 事件唤起 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setHistory(loadHistory()); // 事件处理器内同步读，开/关都无害
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pier:open-search", openModal);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pier:open-search", openModal);
    };
  }, [openModal]);

  /** 加载（或重试）搜索索引；始终在事件/宏任务上下文调用，不在 effect 同步阶段触发 */
  const loadIndex = useCallback(async () => {
    setLoadState("loading");
    try {
      const [{ Index }, res] = await Promise.all([
        import("flexsearch"),
        fetch("/api/search-index"),
      ]);
      if (!res.ok) throw new Error(`search-index ${res.status}`);
      const data = await res.json();
      const list: SearchDoc[] = data[locale] ?? data.en;

      const index = new Index({
        tokenize: "forward",
        cache: true,
      }) as unknown as FlexIndexLike;
      list.forEach((d, i) =>
        index.add(
          i,
          `${d.title} ${d.description} ${d.tags.join(" ")} ${d.keywords.join(
            " "
          )} ${d.excerpt}`
        )
      );
      indexRef.current = index;
      setDocs(list);
      setLoadState("idle");
    } catch {
      setLoadState("error");
    }
  }, [locale]);

  /* 打开时：聚焦、懒加载索引 */
  useEffect(() => {
    if (!open) return;
    // 等 modal 挂载后聚焦
    requestAnimationFrame(() => inputRef.current?.focus());
    if (docs || loadState !== "idle") return;
    // 宏任务中触发加载：effect 同步阶段不调用任何 setState
    const timer = setTimeout(() => void loadIndex(), 0);
    return () => clearTimeout(timer);
  }, [open, docs, loadState, loadIndex]);

  /* 查询：FlexSearch 召回 → rankResults 重排 */
  useEffect(() => {
    if (!query.trim() || !indexRef.current || !docs) {
      setResults([]);
      setSelected(0);
      return;
    }
    const ids = indexRef.current.search(query, { limit: 8 });
    setResults(rankResults(docs, query, ids));
    setSelected(0);
  }, [query, docs]);

  const go = useCallback(
    (doc: SearchDoc) => {
      if (query.trim()) saveHistory(query.trim());
      setOpen(false);
      setQuery("");
      // 手动剥离 query string：i18n router.push 会把整串当 pathname，
      // 导致 "/currents?view=all" 的查询参数丢失
      const qIndex = doc.href.indexOf("?");
      if (qIndex === -1) {
        router.push(doc.href);
      } else {
        const pathname = doc.href.slice(0, qIndex);
        const params = new URLSearchParams(doc.href.slice(qIndex + 1));
        const queryObj: Record<string, string> = {};
        params.forEach((value, key) => {
          queryObj[key] = value;
        });
        router.push({ pathname, query: queryObj });
      }
    },
    [query, router]
  );

  /* 结果内键盘导航 */
  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      go(results[selected]);
    }
  };

  const showEmpty = query.trim() && docs && results.length === 0;
  const showHistory = !query.trim() && history.length > 0;
  const showLoading = loadState === "loading" && !docs;
  const showError = loadState === "error" && !docs;

  const typeLabel = (type: SearchDocType): string =>
    type === "blog"
      ? t("typeBlog")
      : type === "page"
        ? t("typePage")
        : t("typeTopic");

  /* 热门 tag：只统计博客类型的 tags */
  const fallbackTags = useMemo(() => {
    if (!docs) return [];
    const counts = new Map<string, number>();
    docs
      .filter((d) => d.type === "blog")
      .forEach((d) =>
        d.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
      );
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);
  }, [docs]);

  return (
    <>
      {/* Navbar 搜索按钮 */}
      <button
        onClick={openModal}
        data-no-ripple
        aria-label={t("open")}
        className="flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 text-sm text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <kbd className="hidden rounded border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* 模态框 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-[15vh] z-[95] w-[92vw] max-w-xl -translate-x-1/2"
              role="dialog"
              aria-modal="true"
              aria-label={t("title")}
            >
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-2xl">
                {/* 输入框 */}
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-muted)]">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder={t("placeholder")}
                    className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--text-muted)]"
                  />
                  <kbd className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                    ESC
                  </kbd>
                </div>

                {/* 结果区 */}
                <div className="max-h-[50vh] overflow-y-auto p-2">
                  {results.map((doc, i) => (
                    <button
                      key={`${doc.type}:${doc.id}`}
                      onClick={() => go(doc)}
                      onMouseEnter={() => setSelected(i)}
                      data-no-ripple
                      className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                        i === selected
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      <div className="mb-0.5 flex items-center gap-2 font-medium">
                        <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">
                          {typeLabel(doc.type)}
                        </span>
                        <span className="min-w-0 truncate">
                          <Highlight text={doc.title} query={query} />
                        </span>
                      </div>
                      <div className="line-clamp-1 text-sm text-[var(--text-secondary)]">
                        <Highlight text={doc.description} query={query} />
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="mt-1 flex gap-1.5">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}

                  {/* 无结果兜底：热门 tag */}
                  {showEmpty && (
                    <div className="px-3 py-6 text-center">
                      <p className="mb-3 text-sm text-[var(--text-muted)]">
                        {t("noResults")}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {fallbackTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setQuery(tag)}
                            data-no-ripple
                            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 最近搜索 */}
                  {showHistory && (
                    <div className="px-3 py-2">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        {t("recent")}
                      </p>
                      {history.map((term) => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          data-no-ripple
                          className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 加载中 */}
                  {showLoading && (
                    <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                      {t("loading")}
                    </p>
                  )}

                  {/* 加载失败：显式错误态 + 重试 */}
                  {showError && (
                    <div className="px-3 py-6 text-center">
                      <p className="mb-3 text-sm text-[var(--text-muted)]">
                        {t("unavailable")}
                      </p>
                      <button
                        onClick={() => void loadIndex()}
                        data-no-ripple
                        className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                      >
                        {t("retry")}
                      </button>
                    </div>
                  )}

                  {/* 初始空态 */}
                  {!query.trim() &&
                    !showHistory &&
                    !showLoading &&
                    !showError && (
                      <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                        {t("hint")}
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
