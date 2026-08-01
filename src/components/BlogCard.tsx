"use client";

import { useLocale, useTranslations } from "next-intl";
import { TransitionLink } from "@/components/TransitionLink";
import { AnimatedCard } from "@/components/AnimatedCard";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readMinutes?: number;
}

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const t = useTranslations("blog");
  const locale = useLocale();

  return (
    <AnimatedCard className="h-full">
      <TransitionLink
        href={`/blog/${post.slug}`}
        className="group flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-lg"
      >
        {/* Tags — 頂部分類標識 */}
        {post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors duration-200 group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2.5 text-base font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-[var(--accent)]">
          {post.title}
        </h3>

        {/* Description — line-clamp 保證 grid 對齊 */}
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          {post.description}
        </p>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(
                locale === "zh" ? "zh-CN" : "en-US",
                { year: "numeric", month: "short", day: "numeric" }
              )}
            </time>
            {post.readMinutes != null && (
              <>
                <span className="opacity-40">·</span>
                <span>
                  {locale === "zh"
                    ? `${post.readMinutes} 分钟`
                    : `${post.readMinutes} min`}
                </span>
              </>
            )}
          </div>

          <span className="flex items-center gap-1 font-medium text-[var(--accent)] transition-transform duration-200 group-hover:translate-x-1">
            {t("readMore")}
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </TransitionLink>
    </AnimatedCard>
  );
}
