import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { CurrentsHotClient } from "@/components/currents/CurrentsHotClient";
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
    title: `${t("hotTitle")} — ${t("title")} · Pier`,
    description: t("hotSubtitle"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/currents/hot`,
      languages: {
        en: `${SITE_URL}/en/currents/hot`,
        zh: `${SITE_URL}/zh/currents/hot`,
        "x-default": `${SITE_URL}/en/currents/hot`,
      },
    },
    openGraph: {
      title: t("hotTitle"),
      description: t("hotSubtitle"),
      type: "website",
      url: `${SITE_URL}/${locale}/currents/hot`,
    },
  };
}

/** 潮汐 · 热点榜 — SSG 静态壳 + 客户端数据岛（同 /currents 架构） */
export default async function CurrentsHotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");

  return (
    <main className="relative min-h-screen">
      <Navbar />
      <header className="mx-auto max-w-6xl px-6 pb-8 pt-16">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("hotTitle")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">{t("hotSubtitle")}</p>
      </header>
      <CurrentsHotClient />
      <SiteFooter maxWidth="max-w-6xl" />
    </main>
  );
}
