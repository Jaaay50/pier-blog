import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { CurrentsClient } from "@/components/currents/CurrentsClient";
import { locales } from "@/i18n/config";
import { pageJsonLd } from "@/lib/site-metadata";
import { ogCardUrl, pageMetadata } from "@/lib/metadata";
import { safeJsonLd } from "@/lib/json-ld";

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
    title: t("title"),
    description: t("metaDescription"),
    path: "/currents",
    image: ogCardUrl("currents", locale),
  });
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
  const tNav = await getTranslations("currentsNav");

  return (
    <>
      {/* Header：静态 SEO 壳，h1 必须存在于构建产物 HTML。
          副标首句写全产品名「潮汐 · AI 动态」；原 pill 子导航已由侧栏承担 */}
      <header className="pb-8 pt-14">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">
          {tNav("brand")} · {tNav("brandTagline")}——{t("subtitle")}
        </p>
      </header>

      {/* 数据岛：sticky toolbar + 时间线 + 阅读层 */}
      <CurrentsClient />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(pageJsonLd(locale, "currents")) }}
      />
    </>
  );
}
