"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BlogCard } from "@/components/BlogCard";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readMinutes?: number;
}

interface BlogStatsFilterProps {
  posts: BlogPost[];
  noArticlesMessage?: string;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readTagFromLocation(): string | null {
  const value = new URLSearchParams(window.location.search).get("tag");
  return value?.trim() ? value : null;
}

function currentLocationKey(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function writeTagToLocation(tag: string | null) {
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === currentLocationKey()) return;
  window.history.pushState(null, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * 标签筛选 + 客户端文章过滤。
 * - 按 tag 聚合文章数，渲染为可换行、易点击的标签 chip（含数量）
 * - 点击 chip 过滤文章列表；再点当前 tag 恢复显示全部
 * - 筛选写入 ?tag=，刷新、直接打开和浏览器前进后退都会恢复
 * - aria-pressed 表达选中态；键盘可操作，focus-visible 清晰
 * - 文章列表桌面两列 / 移动单列，AnimatePresence 淡入淡出 + layout 平滑重排
 */
export function BlogStatsFilter({
  posts,
  noArticlesMessage = "No articles match this topic.",
}: BlogStatsFilterProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useIsoLayoutEffect(() => {
    const sync = () => setActiveTag(readTagFromLocation());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) =>
      p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1))
    );
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts;

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-12 flex flex-wrap gap-3" role="group">
        {tagCounts.map(([tag, count]) => {
          const active = activeTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => writeTagToLocation(active ? null : tag)}
              aria-pressed={active}
              className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tag}
              <span
                className={`text-xs tabular-nums ${
                  active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <motion.div layout className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((post) => (
            <motion.div
              key={post.slug}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-full min-w-0"
            >
              <BlogCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {filtered.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">
          {noArticlesMessage}
        </p>
      )}
    </div>
  );
}
