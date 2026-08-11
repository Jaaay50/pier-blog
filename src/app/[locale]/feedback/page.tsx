import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteFeedbackForm, type SiteFeedbackLabels } from "@/components/feedback/SiteFeedbackForm";
import { locales } from "@/i18n/config";


const SITE_URL = "https://ethanpier.com";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feedbackPage" });

  return {
    title: `${t("title")} — Pier`,
    description: t("subtitle"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/feedback`,
      languages: {
        en: `${SITE_URL}/en/feedback`,
        zh: `${SITE_URL}/zh/feedback`,
        "x-default": `${SITE_URL}/en/feedback`,
      },
    },
  };
}

/**
 * 全局产品反馈页（阶段 C）：匿名提交产品问题 / 功能建议 / 信源建议 / Agent 接入问题。
 * 与详情页内容纠错共享后端 /v1/feedback 端点（targetType "site"）。
 */
export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("feedbackPage");



  const labels: SiteFeedbackLabels = {
    categoryLabel: t("categoryLabel"),
    categories: {
      product_bug: t("categoryProductBug"),
      feature_request: t("categoryFeatureRequest"),
      source_suggestion: t("categorySourceSuggestion"),
      agent_access: t("categoryAgentAccess"),
      other: t("categoryOther"),
    },
    messageLabel: t("messageLabel"),
    messagePlaceholder: t("messagePlaceholder"),
    messageRequired: t("messageRequired"),
    submit: t("submit"),
    submitting: t("submitting"),
    success: t("success"),
    successDuplicate: t("successDuplicate"),
    alreadyReported: t("alreadyReported"),
    errorRateLimit: t("errorRateLimit"),
    errorNetwork: t("errorNetwork"),
    errorGeneric: t("errorGeneric"),
  };

  return (
    <main className="relative min-h-screen">
      <Navbar />

      <header className="mx-auto max-w-3xl px-6 pb-8 pt-16">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl leading-relaxed text-[var(--text-secondary)]">
          {t("subtitle")}
        </p>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16">
        <SiteFeedbackForm locale={locale} labels={labels} />
        <p className="mt-8 border-t border-[var(--border)] pt-6 text-[13px] leading-relaxed text-[var(--text-muted)]">
          {t("contentCorrectionNote")}
        </p>
      </section>

      <SiteFooter maxWidth="max-w-3xl" />


    </main>
  );
}
