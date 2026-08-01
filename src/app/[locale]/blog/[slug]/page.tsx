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
import { locales } from "@/i18n/config";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);
  if (!post) return {};

  const ogUrl = new URL("https://ethanpier.com/og");
  ogUrl.searchParams.set("title", post.title);
  if (post.description) ogUrl.searchParams.set("description", post.description);
  if (post.tags.length) ogUrl.searchParams.set("tags", post.tags.join(","));
  ogUrl.searchParams.set("readMin", String(post.readMinutes));

  return {
    title: `${post.title} — Pier`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogUrl.toString()],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getPostBySlug(slug, locale);
  const t = await getTranslations("blog");
  const tFooter = await getTranslations("footer");

  if (!post) {
    notFound();
  }

  const { content, headings } = await compileMDXWithHeadings(post.content);
  const related = getRelatedPosts(post, getAllPosts(locale));

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
            author: {
              "@type": "Person",
              name: "Ethan Pier",
              url: "https://ethanpier.com",
            },
            publisher: {
              "@type": "Person",
              name: "Ethan Pier",
              url: "https://ethanpier.com",
            },
            url: `https://ethanpier.com/blog/${post.slug}`,
            keywords: post.tags.join(", "),
            timeRequired: `PT${post.readMinutes}M`,
          }),
        }}
      />
      <ScrollProgress />
      <Navbar />

      {/* Article + TOC 双栏布局 */}
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-16">
        <article className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl">
          {/* Header */}
          <header className="mb-12">
            <div className="mb-4 flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <Link
                href="/blog"
                className="transition-colors hover:text-[var(--accent)]"
              >
                ← {t("back")}
              </Link>
              <span>•</span>
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span>•</span>
              <span>{locale === "zh" ? `${post.readMinutes} 分钟` : `${post.readMinutes} min read`}</span>
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              {post.title}
            </h1>
            <div className="flex gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[var(--bg-card)] px-3 py-1 text-sm text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
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

      {/* 相关阅读（Phase 7：tag 交集 + 日期接近度打分） */}
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-4xl text-center text-sm text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} Pier. {tFooter("builtWith")}</p>
        </div>
      </footer>
    </main>
  );
}

export function generateStaticParams() {
  // 每篇文章 × 每個 locale 都靜態生成
  return locales.flatMap((locale) =>
    getAllSlugs().map((slug) => ({ locale, slug }))
  );
}
