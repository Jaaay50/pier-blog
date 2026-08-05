import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { serverFetchDailyByDate } from "@/lib/currents/api";
import { CurrentsDailyBody } from "@/components/currents/CurrentsDailyBody";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const SITE_URL = "https://ethanpier.com";

interface PageProps {
  params: Promise<{ locale: string; date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, date } = await params;
  const t = await getTranslations({ locale, namespace: "currents" });
  const report = await serverFetchDailyByDate(date, locale);
  if (!report) return {};
  const title = `${t("dailyTitle")} ${date} — 潮汐 · Currents`;
  const description = report.lead?.title ?? t("subtitle");
  const canonicalUrl = `${SITE_URL}/${locale}/currents/daily/${date}`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}/en/currents/daily/${date}`,
        zh: `${SITE_URL}/zh/currents/daily/${date}`,
        "x-default": `${SITE_URL}/en/currents/daily/${date}`,
      },
    },
    openGraph: { title, description, type: "article", url: canonicalUrl, locale: locale === "zh" ? "zh_CN" : "en_US" },
  };
}

export default async function CurrentsDailyDatePage({ params }: PageProps) {
  const { locale, date } = await params;
  setRequestLocale(locale);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const t = await getTranslations("currents");
  const report = await serverFetchDailyByDate(date, locale);
  if (!report) notFound();

  return (
    <main className="relative min-h-screen">
      <Navbar />
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
      <SiteFooter maxWidth="max-w-6xl" />
    </main>
  );
}
