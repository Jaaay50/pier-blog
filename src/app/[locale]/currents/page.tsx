import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { CurrentsClient } from "@/components/currents/CurrentsClient";
import { CurrentsServerFeed } from "@/components/currents/CurrentsServerFeed";
import { locales } from "@/i18n/config";
import { pageJsonLd } from "@/lib/site-metadata";
import { ogCardUrl, pageMetadata } from "@/lib/metadata";
import { safeJsonLd } from "@/lib/json-ld";
import { serverFetchItems, serverFetchSources } from "@/lib/currents/api";

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

export const revalidate = 300;

/**
 * 潮汐 · Currents — ISR 首屏直出前 20 条；筛选、密度、已读弱化仍由客户端接管。
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
  const [itemsRes, sourcesRes] = await Promise.all([
    serverFetchItems({ locale, view: "selected", limit: 20 }),
    serverFetchSources(),
  ]);
  const initial =
    itemsRes && itemsRes.items.length > 0
      ? {
          items: itemsRes.items,
          nextCursor: itemsRes.nextCursor,
          hasMore: itemsRes.hasMore,
          sources: (sourcesRes?.sources ?? []).filter((s) => s.enabled !== false),
        }
      : null;

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

      {initial ? (
        <CurrentsServerFeed locale={locale} items={initial.items} sources={initial.sources} />
      ) : null}
      <div className="currents-client-feed">
        <CurrentsClient initial={initial} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(pageJsonLd(locale, "currents")) }}
      />
    </>
  );
}
