import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { serverFetchDailyLatest } from "@/lib/currents/api";
import { CurrentsDailyBody } from "@/components/currents/CurrentsDailyBody";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const SITE_URL = "https://ethanpier.com";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "currents" });
  const report = await serverFetchDailyLatest(locale);
  const title = `${t("dailyTitle")} — 潮汐 · Currents`;
  const description = report?.lead?.title ?? t("subtitle");
  const canonicalUrl = `${SITE_URL}/${locale}/currents/daily`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}/en/currents/daily`,
        zh: `${SITE_URL}/zh/currents/daily`,
        "x-default": `${SITE_URL}/en/currents/daily`,
      },
    },
    openGraph: { title, description, type: "article", url: canonicalUrl, locale: locale === "zh" ? "zh_CN" : "en_US" },
  };
}

export default async function CurrentsDailyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");
  const report = await serverFetchDailyLatest(locale);
  if (!report) notFound();

  return (
    <>
      <CurrentsDailyBody
        report={report}
        locale={locale}
        labels={{
          dailyTitle: t("dailyTitle"),
          latestDaily: t("latestDaily"),
          dailyArchive: t("dailyArchive"),
          back: t("backToCurrents"),
          readOriginal: t("readOriginal"),
          empty: t("empty"),
        }}
      />
    </>
  );
}
