import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { serverFetchItemDetail, serverFetchSources } from "@/lib/currents/api";
import { safeJsonLd } from "@/lib/json-ld";
import { renderMarkdown } from "@/lib/currents/markdown";
import { CurrentsDetailBody } from "@/components/currents/CurrentsDetailBody";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // 运行时按需生成，不预构建
}

const SITE_URL = "https://ethanpier.com";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

function buildOgImageUrl(title: string, description: string, tags: string[]): string {
  const ogUrl = new URL(`${SITE_URL}/og`);
  ogUrl.searchParams.set("title", title);
  if (description) ogUrl.searchParams.set("description", description);
  if (tags.length) ogUrl.searchParams.set("tags", tags.join(","));
  return ogUrl.toString();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  // 只有 404 返回空 metadata 走 not-found；5xx/网络/非法 JSON 上抛 → error.tsx，不缓存为 404。
  const item = await serverFetchItemDetail(id, locale);
  if (!item) return {};

  const title = item.title ?? item.originalTitle ?? "";
  const description = item.summary ?? item.reason ?? "";
  const ogImage = buildOgImageUrl(title, description, item.tags ?? []);
  const canonicalUrl = `${SITE_URL}/${locale}/currents/${id}`;

  return {
    title: `${title} — 潮汐 · Currents`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}/en/currents/${id}`,
        zh: `${SITE_URL}/zh/currents/${id}`,
        "x-default": `${SITE_URL}/en/currents/${id}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      publishedTime: item.publishedAt ?? undefined,
      tags: item.tags ?? undefined,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CurrentsDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const item = await serverFetchItemDetail(id, locale);
  if (!item) notFound();
  const t = await getTranslations("currents");

  const deepReadHtml = item.deepRead ? await renderMarkdown(item.deepRead) : null;

  // 批次 2：原文全文翻译（按 locale 与原文语言取目标语种列）
  const translationSource =
    locale === "zh"
      ? (item.contentTranslationZh ?? null)
      : (item.contentTranslationEn ?? null);
  const translationHtml = translationSource ? await renderMarkdown(translationSource) : null;

  // 来源 id → 名称映射（与列表页一致），失败时回退原始 sourceId
  const sourcesRes = await serverFetchSources();
  const sourceMeta = item.sourceId
    ? sourcesRes?.sources.find((s) => s.id === item.sourceId)
    : undefined;
  const sourceName = sourceMeta ? (locale === "zh" ? (sourceMeta.nameZh ?? sourceMeta.name) : sourceMeta.name) : null;

  const categoryLabels: Record<string, string> = {};
  for (const key of ["models", "products", "industry", "papers", "tutorials", "opinions", "opensource"] as const) {
    categoryLabels[key] = t(key);
  }

  return (
    <main className="relative min-h-screen">
      {/* NewsArticle JSON-LD（外部数据经 safeJsonLd 防 </script> 逃逸） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: item.title ?? item.originalTitle,
            description: item.summary ?? undefined,
            datePublished: item.publishedAt ?? undefined,
            inLanguage: locale === "zh" ? "zh-CN" : "en-US",
            image: item.imageUrl ?? buildOgImageUrl(item.title ?? "", item.summary ?? "", item.tags ?? []),
            author: item.author
              ? { "@type": "Person", name: item.author }
              : { "@type": "Organization", name: item.sourceId ?? "Currents" },
            mainEntityOfPage: `${SITE_URL}/${locale}/currents/${id}`,
            url: `${SITE_URL}/${locale}/currents/${id}`,
          }),
        }}
      />
      <Navbar />
      <CurrentsDetailBody
        item={item}
        deepReadHtml={deepReadHtml}
        translationHtml={translationHtml}
        locale={locale}
        labels={{
          back: t("backToCurrents"),
          readOriginal: t("readOriginal"),
          aiSummary: t("aiSummary"),
          whyWorth: t("whyWorth"),
          deepRead: t("deepRead"),
          deepReadPending: t("deepReadPending"),
          scoreBreakdown: t("scoreBreakdown"),
          related: t("related"),
          tagsLabel: t("tagsLabel"),
          otherSources: t("otherSources"),
          originalTitleLabel: t("originalTitleLabel"),
          categoryLabels,
          translationTab: t("translationTab"),
          aiSummaryTab: t("aiSummaryTab"),
          deepReadTab: t("deepReadTab"),
          translationPending: t("translationPending"),
          feedback: {
            trigger: t("feedbackTrigger"),
            title: t("feedbackTitle"),
            categoryLabel: t("feedbackCategoryLabel"),
            categories: {
              content_error: t("feedbackCategoryContentError"),
              translation_issue: t("feedbackCategoryTranslationIssue"),
              broken_link: t("feedbackCategoryBrokenLink"),
              category_or_score: t("feedbackCategoryCategoryOrScore"),
              other: t("feedbackCategoryOther"),
            },
            messageLabel: t("feedbackMessageLabel"),
            messagePlaceholder: t("feedbackMessagePlaceholder"),
            submit: t("feedbackSubmit"),
            submitting: t("feedbackSubmitting"),
            success: t("feedbackSuccess"),
            alreadyReported: t("feedbackAlreadyReported"),
            errorRateLimit: t("feedbackErrorRateLimit"),
            errorNetwork: t("feedbackErrorNetwork"),
            errorGeneric: t("feedbackErrorGeneric"),
            close: t("feedbackClose"),
          },
        }}
        sourceName={sourceName}
      />
      <SiteFooter maxWidth="max-w-6xl" />
    </main>
  );
}
