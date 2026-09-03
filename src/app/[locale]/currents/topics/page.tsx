import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { CurrentsTopicsClient } from "@/components/currents/CurrentsTopicsClient";
import { locales } from "@/i18n/config";
import { pageMetadata } from "@/lib/metadata";

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
    title: `${t("topicsTitle")} — ${t("title")}`,
    description: t("topicsSubtitle"),
    path: "/currents/topics",
  });
}

/** 潮汐 · 主题地图 — SSG 静态壳 + 客户端数据岛 */
export default async function CurrentsTopicsPage({
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
          {t("topicsTitle")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">{t("topicsSubtitle")}</p>
      </header>
      <CurrentsTopicsClient />
    </>
  );
}
