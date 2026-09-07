import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Navbar } from "@/components/Navbar";
import { getAllPosts } from "@/lib/posts";
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

      <PageHero label={t("label")} title={t("title")} description={t("subtitle")} />

      {/* Tag 标签筛选 + 可过滤文章列表（Hero 与正文使用统一响应式间距） */}
      <section className="pb-20 pt-10 md:pt-16">
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
