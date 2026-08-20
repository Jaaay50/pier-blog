"use client";

import { useMemo, useState } from "react";
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
}

/**
 * Phase 6：tag 条形图 + 客户端文章过滤。
 * - 按 tag 聚合文章数，横向条形弹性伸长入场（stagger）
 * - 点击条形过滤文章列表；再点当前 tag 恢复显示全部
 * - 列表切换用 AnimatePresence 淡入淡出 + layout 平滑重排
 */
export function BlogStatsFilter({ posts }: BlogStatsFilterProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) =>
      p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1))
    );
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const maxCount = tagCounts[0]?.[1] ?? 1;

  const filtered = activeTag
    ? posts.filter((p) => p.tags.includes(activeTag))
    : posts;

  return (
    <div>
      {/* Tag 条形图 */}
      <div className="mb-10 space-y-2">
        {tagCounts.map(([tag, count], i) => {
          const active = activeTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setActiveTag(active ? null : tag)}
              data-no-ripple
              aria-pressed={active}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span
                className={`w-32 shrink-0 truncate text-sm transition-colors ${
                  active
                    ? "font-semibold text-[var(--accent)]"
                    : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                {tag}
              </span>
              <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-[var(--bg-card)]">
                <motion.span
                  className={`absolute inset-y-0 left-0 rounded-md ${
                    active ? "bg-[var(--accent)]" : "bg-[var(--accent)]/35"
                  } transition-colors group-hover:bg-[var(--accent)]/60`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 20,
                    delay: i * 0.08,
                  }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 文章列表（过滤 + 平滑重排） */}
      <motion.div layout className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((post) => (
            <motion.div
              key={post.slug}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <BlogCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
