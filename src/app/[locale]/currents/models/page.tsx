import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { ModelsLeaderboardClient } from "@/components/currents/ModelsLeaderboardClient";
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
  const t = await getTranslations({ locale, namespace: "currents" });

  return {
    title: `${t("modelsTitle")} — ${t("title")} · Pier`,
    description: t("modelsSubtitle"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/currents/models`,
      languages: {
        en: `${SITE_URL}/en/currents/models`,
        zh: `${SITE_URL}/zh/currents/models`,
        "x-default": `${SITE_URL}/en/currents/models`,
      },
    },
    openGraph: {
      title: t("modelsTitle"),
      description: t("modelsSubtitle"),
      type: "website",
      url: `${SITE_URL}/${locale}/currents/models`,
    },
  };
}

/** 潮汐 · 模型榜 — SSG 静态壳 + 客户端数据岛（同 /currents/hot 架构） */
export default async function CurrentsModelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");

  return (
    <>
      <header className="pb-8 pt-14">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("modelsTitle")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">{t("modelsSubtitle")}</p>
      </header>
      <ModelsLeaderboardClient />
    </>
  );
}
