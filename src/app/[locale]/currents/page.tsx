import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { CurrentsClient } from "@/components/currents/CurrentsClient";
import { Link } from "@/i18n/navigation";
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
    title: `${t("title")} — Pier`,
    description: t("subtitle"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/currents`,
      languages: {
        en: `${SITE_URL}/en/currents`,
        zh: `${SITE_URL}/zh/currents`,
        "x-default": `${SITE_URL}/en/currents`,
      },
    },
  };
}

/**
 * 潮汐 · Currents — SSG 静态壳 + 客户端数据岛（方案 13.2）。
 * 本文件保持纯 Server Component：不调用 cookies()/headers()/getLocale()，
 * 所有 API 数据获取都在 CurrentsClient（"use client"）中完成。
 */
export default async function CurrentsPage({
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

      {/* Header：静态 SEO 壳，h1 必须存在于构建产物 HTML */}
      <header className="mx-auto max-w-6xl px-6 pb-8 pt-16">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">{t("subtitle")}</p>
        {/* 批次 2：热点榜 / 主题地图入口（页头，不挤移动端工具栏） */}
        <nav aria-label="currents-sub" className="mt-4 flex gap-2">
          <Link
            href="/currents/hot"
            className="rounded-full border border-[var(--border)] px-3.5 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--accent)]"
          >
            {t("hotTitle")}
          </Link>
          <Link
            href="/currents/topics"
            className="rounded-full border border-[var(--border)] px-3.5 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--accent)]"
          >
            {t("topicsTitle")}
          </Link>
        </nav>
      </header>

      {/* 数据岛：sticky toolbar + 时间线 + 阅读层 */}
      <CurrentsClient />

      <SiteFooter maxWidth="max-w-6xl" />
    </main>
  );
}
