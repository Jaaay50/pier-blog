import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { CurrentsTopicsClient } from "@/components/currents/CurrentsTopicsClient";
import { locales } from "@/i18n/config";
import { currentsTitleSuffix, pageMetadata } from "@/lib/metadata";
import { serverFetchTopics } from "@/lib/currents/api";

export const revalidate = 300;

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
  return pageMetadata(locale, {
    title: t("topicsTitle"),
    description: t("topicsSubtitle"),
    path: "/currents/topics",
    titleSuffix: currentsTitleSuffix(locale),
  });
}

/** 潮汐 · 主题地图 — ISR 首屏，故障时保留客户端重试。 */
export default async function CurrentsTopicsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");
  const initial = await serverFetchTopics(locale);

  return (
    <>
      <header className="pb-8 pt-14">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("topicsTitle")}
        </h1>
      </header>
      <CurrentsTopicsClient initial={initial} />
    </>
  );
}
