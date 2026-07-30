import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { getPostBySlug, getAllSlugs } from "@/lib/posts";
import { compileMDXWithHeadings } from "@/components/MDXContent";
import { TableOfContents } from "@/components/TableOfContents";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const t = await getTranslations("blog");
  const tFooter = await getTranslations("footer");

  if (!post) {
    notFound();
  }

  const { content, headings } = await compileMDXWithHeadings(post.content);

  return (
    <main className="min-h-screen">
      <ScrollProgress />
      <Navbar />

      {/* Article + TOC 双栏布局 */}
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-16">
        <article className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl">
          {/* Header */}
          <ScrollReveal>
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
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
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
          </ScrollReveal>

          {/* MDX Content */}
          <ScrollReveal delay={0.2}>
          <div className="prose max-w-none">{content}</div>
          </ScrollReveal>
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-4xl text-center text-sm text-[var(--text-muted)]">
          <p>© 2024 Pier. {tFooter("builtWith")}</p>
        </div>
      </footer>
    </main>
  );
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}
