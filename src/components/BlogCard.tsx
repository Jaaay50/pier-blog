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
        className="group block h-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] hover:shadow-xl"
      >
      <div className="mb-3 flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <time dateTime={post.date}>
          {new Date(post.date).toLocaleDateString(
            locale === "zh" ? "zh-CN" : "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          )}
        </time>
        <span>•</span>
        <div className="flex gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--bg-primary)] px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <h3 className="mb-2 text-xl font-semibold tracking-tight transition-colors group-hover:text-[var(--accent)]">
        {post.title}
      </h3>

      <p className="text-[var(--text-secondary)] leading-relaxed">
        {post.description}
      </p>

      <div className="mt-4 flex items-center text-sm font-medium text-[var(--accent)] transition-transform group-hover:translate-x-1">
        {t("readMore")}
        <svg
          className="ml-1 h-4 w-4"
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
      </div>
      </TransitionLink>
    </AnimatedCard>
  );
}
