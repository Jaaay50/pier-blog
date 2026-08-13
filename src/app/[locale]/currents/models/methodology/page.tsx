import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { ModelsMethodologyClient } from "@/components/currents/ModelsMethodologyClient";
import { locales } from "@/i18n/config";

const SITE_URL = "https://ethanpier.com";
const OG_IMAGE = `${SITE_URL}/og?type=site`;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "currents" });

  return {
    title: `${t("modelsMethTitle")} — ${t("modelsTitle")} · Pier`,
    description: t("modelsMethSubtitle"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/currents/models/methodology`,
      languages: {
        en: `${SITE_URL}/en/currents/models/methodology`,
        zh: `${SITE_URL}/zh/currents/models/methodology`,
        "x-default": `${SITE_URL}/en/currents/models/methodology`,
      },
    },
    openGraph: {
      title: t("modelsMethTitle"),
      description: t("modelsMethSubtitle"),
      type: "website",
      url: `${SITE_URL}/${locale}/currents/models/methodology`,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("modelsMethTitle"),
      description: t("modelsMethSubtitle"),
      images: [OG_IMAGE],
    },
  };
}

/**
 * 模型榜方法页：静态收录规则与公式说明（SSG）+ 来源运行状态数据岛。
 * 公式文案与后端 mlv1 冻结参数一致（docs/model-leaderboard-design.md）。
 */
export default async function CurrentsModelsMethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");

  const rules: Array<{ heading: string; body: string }> = [
    { heading: t("modelsMethRuleInclusionH"), body: t("modelsMethRuleInclusion") },
    { heading: t("modelsMethRuleScoringH"), body: t("modelsMethRuleScoring") },
    { heading: t("modelsMethRuleConfidenceH"), body: t("modelsMethRuleConfidence") },
    { heading: t("modelsMethRuleValueH"), body: t("modelsMethRuleValue") },
    { heading: t("modelsMethRuleFailureH"), body: t("modelsMethRuleFailure") },
  ];

  return (
    <>
      <header className="pb-8 pt-14">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("modelsMethTitle")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">{t("modelsMethSubtitle")}</p>
      </header>

      <section aria-labelledby="meth-rules" className="mb-10">
        <h2 id="meth-rules" className="sr-only">
          {t("modelsMethRulesLabel")}
        </h2>
        <div className="space-y-5">
          {rules.map((rule) => (
            <div key={rule.heading} className="rounded-xl border border-[var(--border)] p-4">
              <h3 className="mb-1.5 text-sm font-semibold text-[var(--text-primary)]">{rule.heading}</h3>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{rule.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ModelsMethodologyClient />
    </>
  );
}
