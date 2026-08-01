"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useRef, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import BlurText from "@/components/reactbits/BlurText";

const emptySubscribe = () => () => {};

/** 触控设备检测（SSR 返回 false） */
function useCoarsePointer() {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
}

interface HorizontalArticlesProps {
  title: string;
  posts: BlogPost[];
  readMore: string;
}

/**
 * 第四屏：文章横向滚动画廊
 * - 横向 scroll-snap，每篇文章占满宽度
 * - 视差效果：文字层快，背景装饰慢
 * - 移动端降级为竖向滚动
 */
export function HorizontalArticles({
  title,
  posts,
  readMore,
}: HorizontalArticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const inView = useInView(titleRef, { once: true, margin: "-10%" });

  return (
    <section className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* 标题 */}
        <div ref={titleRef} className="mb-12">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {inView ? (
              <BlurText
                text={title}
                delay={60}
                animateBy="letters"
                direction="top"
                className="justify-start"
              />
            ) : (
              <span className="opacity-0">{title}</span>
            )}
          </h2>
        </div>

        {/* 横向滚动容器（桌面端）+ 竖向（移动端） */}
        <div
          ref={containerRef}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 md:flex-row md:gap-8 flex-col md:overflow-x-scroll"
          style={{ scrollbarWidth: "thin" }}
        >
          {posts.map((post, i) => (
            <ArticleCard key={post.slug} post={post} index={i} readMore={readMore} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ArticleCardProps {
  post: BlogPost;
  index: number;
  readMore: string;
}

function ArticleCard({ post, index, readMore }: ArticleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const coarse = useCoarsePointer();
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  // 视差：背景装饰慢（-30px → 30px），前景文字快（-60px → 60px）
  // Phase 4：触控设备关闭视差（竖向滚动 + 视差会抖动）
  const bgYRange = useTransform(scrollYProgress, [0, 1], [-30, 30]);
  const contentYRange = useTransform(scrollYProgress, [0, 1], [-60, 60]);
  const bgY = coarse ? 0 : bgYRange;
  const contentY = coarse ? 0 : contentYRange;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-w-full snap-start md:min-w-[28rem] md:max-w-md"
    >
      <Link
        href={`/blog/${post.slug}`}
        className="card-interactive group relative flex h-[28rem] flex-col justify-between overflow-hidden rounded-2xl p-8"
      >
        {/* 背景装饰（视差慢） */}
        <motion.div
          style={{ y: bgY }}
          className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-[var(--accent)]/10 to-transparent blur-3xl"
        />

        {/* 前景内容（视差快） */}
        <motion.div style={{ y: contentY }} className="relative z-10">
          {/* 日期 + 标签 */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--bg-primary)] px-2.5 py-1"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 标题 + 描述 */}
          <h3 className="mb-3 text-2xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
            {post.title}
          </h3>
          <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {post.description}
          </p>

          {/* CTA */}
          <div className="flex items-center text-sm font-medium text-[var(--accent)] transition-transform group-hover:translate-x-2">
            {readMore}
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
