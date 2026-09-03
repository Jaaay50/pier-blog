import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { getAllPosts } from "@/lib/posts";
import DecryptedText from "@/components/reactbits/DecryptedText";
import { FluidBackground } from "@/components/webgl/FluidBackground";
import { BlogStatsFilter } from "@/components/viz/BlogStatsFilter";
import { SiteFooter } from "@/components/SiteFooter";
import { pageJsonLd } from "@/lib/site-metadata";
import { pageMetadata } from "@/lib/metadata";
import { safeJsonLd } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return pageMetadata(locale, {
    title: t("title"),
    description: t("subtitle"),
    path: "/blog",
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = getAllPosts(locale);
  const t = await getTranslations("blog");

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header（带流体 Shader 背景，低端设备自动降级为静态渐变）
          背景全宽流体；内容走 site-content 轴线；文本自身限制行长 */}
      <section className="relative overflow-hidden py-20">
        <FluidBackground
          className="pointer-events-none absolute inset-0 opacity-40"
          intensity={0.6}
          speed={0.6}
        />
        <div className="site-content relative">
          <div className="mb-4">
            <DecryptedText
              text={t("label")}
              className="text-sm font-medium text-[var(--text-muted)]"
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Tag 标签筛选 + 可过滤文章列表（Hero 与筛选区之间保持 64px 明确间距） */}
      <section className="pb-20 pt-16">
        <div className="site-content">
          <BlogStatsFilter
            posts={posts.map(({ slug, title, description, date, tags, readMinutes, series, topic, updatedAt }) => ({
              slug,
              title,
              description,
              date,
              tags,
              readMinutes,
              series,
              topic,
              updatedAt,
            }))}
            allArticlesLabel={t("allArticles")}
            filterLabel={t("filterLabel")}
            articleCountSingular={t("articleCount", { count: 1 })}
            articleCountPlural={t("articleCount", { count: 2 })}
            noArticlesMessage={t("noArticlesForTag")}
          />
        </div>
      </section>

      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(pageJsonLd(locale, "blog")) }}
      />
    </main>
  );
}
