import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { ModelsLeaderboardClient } from "@/components/currents/ModelsLeaderboardClient";
import { locales } from "@/i18n/config";
import { currentsTitleSuffix, pageMetadata } from "@/lib/metadata";
import { serverFetchModelsLeaderboard } from "@/lib/currents/api";

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
    title: t("modelsTitle"),
    description: t("modelsSubtitle"),
    path: "/currents/models",
    titleSuffix: currentsTitleSuffix(locale),
  });
}

/** 潮汐 · 模型榜 — ISR 默认首屏 + 客户端分类与重试。 */
export default async function CurrentsModelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");
  const initial = await serverFetchModelsLeaderboard();

  return (
    <>
      <header className="pb-8 pt-14">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("modelsTitle")}
        </h1>
      </header>
      <ModelsLeaderboardClient initial={initial} />
    </>
  );
}
