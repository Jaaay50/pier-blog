import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { ModelsLeaderboardClient } from "@/components/currents/ModelsLeaderboardClient";
import { locales } from "@/i18n/config";
import { currentsTitleSuffix, pageMetadata } from "@/lib/metadata";

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
