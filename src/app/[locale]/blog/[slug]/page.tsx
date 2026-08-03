import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { getPostBySlug, getAllSlugs, getAllPosts } from "@/lib/posts";
import { getRelatedPosts } from "@/lib/search";
import { BlogCard } from "@/components/BlogCard";
import { compileMDXWithHeadings } from "@/components/MDXContent";
import { TableOfContents } from "@/components/TableOfContents";
import { ScrollProgress } from "@/components/ScrollProgress";
import { GiscusComments } from "@/components/GiscusComments";
import { SiteFooter } from "@/components/SiteFooter";
import { locales } from "@/i18n/config";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const SITE_URL = "https://ethanpier.com";

function buildOgImageUrl(post: {
  title: string;
  description: string;
  tags: string[];
  readMinutes: number;
}): string {
  const ogUrl = new URL(`${SITE_URL}/og`);
  ogUrl.searchParams.set("title", post.title);
  if (post.description) ogUrl.searchParams.set("description", post.description);
  if (post.tags.length) ogUrl.searchParams.set("tags", post.tags.join(","));
  ogUrl.searchParams.set("readMin", String(post.readMinutes));
  return ogUrl.toString();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);
  if (!post) return {};

  const ogImage = buildOgImageUrl(post);
  const canonicalUrl = `${SITE_URL}/${locale}/blog/${slug}`;

  return {
    title: `${post.title} — Pier`,
    description: post.description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}/en/blog/${slug}`,
        zh: `${SITE_URL}/zh/blog/${slug}`,
        "x-default": `${SITE_URL}/en/blog/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: canonicalUrl,
      publishedTime: post.date,
      tags: post.tags,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

/**
 * 根据文章第一个 tag 返回一个用于环境光的 HSL 色相值。
 * 颜色保持极淡（只用于 radial-gradient 背景晕），不干扰正文。
 */
function tagToGlowColor(tag: string): string {
  const map: Record<string, string> = {
    Performance:  "rgba(59,  130, 246, 0.14)",  // blue
    Animation:    "rgba(168, 85,  247, 0.14)",  // purple
    Architecture: "rgba(34,  197, 94,  0.12)",  // green
    React:        "rgba(96,  165, 250, 0.13)",  // sky-blue
    "Next.js":    "rgba(96,  165, 250, 0.13)",  // sky-blue
    AI:           "rgba(139, 92,  246, 0.13)",  // violet
    "System Design": "rgba(20, 184, 166, 0.12)", // teal
    "State Management": "rgba(96, 165, 250, 0.13)",
    "Web Vitals": "rgba(59, 130, 246, 0.14)",
  };
  return map[tag] ?? "rgba(217, 119, 87, 0.10)"; // fallback: accent clay
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getPostBySlug(slug, locale);
  const t = await getTranslations("blog");

  if (!post) {
    notFound();
  }

  const { content, headings } = await compileMDXWithHeadings(post.content);
  const related = getRelatedPosts(post, getAllPosts(locale));

  // 取第一个 tag 决定顶部环境光颜色
  const glowColor = tagToGlowColor(post.tags[0] ?? "");

  return (
    <main className="min-h-screen">
      {/* JSON-LD 結構化數據 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            inLanguage: locale === "zh" ? "zh-CN" : "en-US",
            image: buildOgImageUrl(post),
            author: {
              "@type": "Person",
              name: "Ethan Pier",
              url: SITE_URL,
            },
            publisher: {
              "@type": "Person",
              name: "Ethan Pier",
              url: SITE_URL,
            },
            url: `${SITE_URL}/${locale}/blog/${post.slug}`,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/${locale}/blog/${post.slug}`,
            },
            keywords: post.tags.join(", "),
            timeRequired: `PT${post.readMinutes}M`,
          }),
        }}
      />
      <ScrollProgress />
      <Navbar />

      {/* 文章页顶部环境光：极淡的 tag 色相晕，不干扰阅读 */}
      <div
        className="article-glow pointer-events-none"
        aria-hidden="true"
        style={{ "--article-glow-color": glowColor } as React.CSSProperties}
      />

      {/* Article + TOC 双栏布局 */}
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-16">
        <article className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl">

            {/* ── Header ── */}
            <header className="mb-16">
              {/* Back link */}
              <div className="mb-6">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("back")}
                </Link>
              </div>

              {/* Tags — 标题上方 */}
              {post.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                {post.title}
              </h1>

              {/* Divider */}
              <hr className="mb-5 border-[var(--border)]" />

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString(
                    locale === "zh" ? "zh-CN" : "en-US",
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                </time>
                <span className="opacity-40">·</span>
                <span>
                  {locale === "zh"
                    ? `${post.readMinutes} 分钟阅读`
                    : `${post.readMinutes} min read`}
                </span>
              </div>
            </header>

            {/* MDX Content */}
            <div className="prose max-w-none">{content}</div>
          </div>
        </article>

        {/* TOC 侧边栏（桌面端 sticky，移动端悬浮按钮） */}
        <div className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <TableOfContents headings={headings} />
          </div>
        </div>
      </div>

      {/* 移动端 TOC（悬浮） */}
      <div className="lg:hidden">
        <TableOfContents headings={headings} />
      </div>

      {/* 相关阅读 */}
      {related.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold tracking-tight">
              {t("related")}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard
                  key={p.slug}
                  post={{
                    slug: p.slug,
                    title: p.title,
                    description: p.description,
                    date: p.date,
                    tags: p.tags,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 留言（Giscus — GitHub Discussions） */}
      <GiscusComments term={`blog/${post.slug}`} />

      <SiteFooter />
    </main>
  );
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getAllSlugs().map((slug) => ({ locale, slug }))
  );
}
