import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { serverFetchEventDetail } from "@/lib/currents/api";
import { safeJsonLd } from "@/lib/json-ld";
import { CurrentsEventBody } from "@/components/currents/CurrentsEventBody";
import type { CurrentsEventReportRole, CurrentsHotStatus } from "@/lib/currents/types";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // 运行时按需生成，不预构建
}

const SITE_URL = "https://ethanpier.com";

interface PageProps {
  params: Promise<{ locale: string; eventId: string }>;
}

function buildOgImageUrl(title: string, description: string, tags: string[]): string {
  const ogUrl = new URL(`${SITE_URL}/og`);
  ogUrl.searchParams.set("title", title);
  if (description) ogUrl.searchParams.set("description", description);
  if (tags.length) ogUrl.searchParams.set("tags", tags.join(","));
  return ogUrl.toString();
}

function eventPath(locale: string, eventId: string) {
  return `/${locale}/currents/events/${eventId}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, eventId } = await params;
  // 只有 404（事件不存在）才返回空 metadata 让页面走 not-found；
  // 5xx/网络/非法 JSON 会向上抛 CurrentsServerFetchError → error.tsx 可重试错误态，不缓存为 404。
  const event = await serverFetchEventDetail(eventId, locale);
  if (!event) return {};

  // merge 旧 ID：canonical/hreflang 一律指向解析后的规范事件 URL
  const canonicalId = event.eventId;
  const title = event.title ?? "";
  const description = event.summary ?? event.progress ?? "";
  const ogImage = buildOgImageUrl(title, description, []);
  const canonicalUrl = `${SITE_URL}${eventPath(locale, canonicalId)}`;

  return {
    title: `${title} — 潮汐 · Currents`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}${eventPath("en", canonicalId)}`,
        zh: `${SITE_URL}${eventPath("zh", canonicalId)}`,
        "x-default": `${SITE_URL}${eventPath("en", canonicalId)}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      publishedTime: event.firstSeenAt,
      modifiedTime: event.latestActivityAt,
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

export default async function CurrentsEventPage({ params }: PageProps) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);
  const event = await serverFetchEventDetail(eventId, locale);
  if (!event) notFound();

  // merge 旧 ID 的分享链接 308 收敛到最终事件页；split 子事件 resolvedFromAlias=false 不跳转
  if (event.resolvedFromAlias && event.eventId !== eventId) {
    permanentRedirect(eventPath(locale, event.eventId));
  }

  const t = await getTranslations("currents");

  const statusLabels = {
    new: t("hotStatusNew"),
    rising: t("hotStatusRising"),
    peak: t("hotStatusPeak"),
    cooling: t("hotStatusCooling"),
    ended: t("hotStatusEnded"),
    active: t("hotStatusActive"),
  } as Record<CurrentsHotStatus, string>;

  const roleLabels = {
    official: t("eventRoleOfficial"),
    media: t("eventRoleMedia"),
    community: t("eventRoleCommunity"),
    aggregator: t("eventRoleAggregator"),
  } as Record<CurrentsEventReportRole, string>;

  const canonicalUrl = `${SITE_URL}${eventPath(locale, event.eventId)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: event.title ?? undefined,
    description: event.summary ?? undefined,
    datePublished: event.firstSeenAt,
    dateModified: event.latestActivityAt,
    inLanguage: locale === "zh" ? "zh-CN" : "en-US",
    image: buildOgImageUrl(event.title ?? "", event.summary ?? "", []),
    author: { "@type": "Organization", name: "Currents" },
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
  };

  return (
    <main className="relative min-h-screen">
      {/* NewsArticle JSON-LD（外部数据经 safeJsonLd 防 </script> 逃逸） */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Navbar />
      <CurrentsEventBody
        event={event}
        locale={locale}
        labels={{
          back: t("eventBack"),
          timeline: t("eventTimeline"),
          timelineSubtitle: t("eventTimelineSubtitle"),
          representative: t("eventRepresentative"),
          readOriginal: t("readOriginal"),
          firstSeen: t("eventFirstSeen"),
          latestActivity: t("eventLatestActivity"),
          heat: t("hotHeat"),
          reports: t("hotReports", { count: event.independentReportCount }),
          official: t("hotOfficial", { count: event.officialReportCount }),
          community: t("hotCommunity", { score: "__SCORE__", comments: "__COMMENTS__" }),
          confidenceHigh: t("eventConfidenceHigh"),
          confidenceLow: t("eventConfidenceLow"),
          sameOrg: t("eventSameOrg"),
          notIndependent: t("eventNotIndependent"),
          typeNews: t("hotTypeNews"),
          typeProduct: t("hotTypeProduct"),
          typeResearch: t("hotTypeResearch"),
          statusLabels,
          roleLabels,
          splitParent: t("eventSplitParent"),
          splitChildren: t("eventSplitChildren"),
          untitled: t("hotUntitled"),
          heatChart: {
            title: t("eventHeatChartTitle"),
            subtitle: t("eventHeatChartSubtitle"),
            empty: t("eventHeatChartEmpty"),
            single: t("eventHeatChartSingle", { time: "__TIME__" }),
            now: t("eventHeatChartNow"),
            ago24h: t("eventHeatChartAgo24h"),
            point: t("eventHeatChartPoint", { time: "__TIME__", heat: "__HEAT__" }),
            accessibleSummary: t("eventHeatChartSummary", {
              count: "__COUNT__",
              peak: "__PEAK__",
              peakTime: "__PEAK_TIME__",
              latest: "__LATEST__",
            }),
          },
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
      />
      <SiteFooter maxWidth="max-w-6xl" />
    </main>
  );
}
