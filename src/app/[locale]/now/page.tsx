import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PageHero } from "@/components/PageHero";
import { SiteFooter } from "@/components/SiteFooter";
import { locales } from "@/i18n/config";
import { NOW_UPDATED } from "@/lib/now";
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
  const t = await getTranslations({ locale, namespace: "now" });
  return pageMetadata(locale, {
    title: t("title"),
    description: t("metaDescription"),
    path: "/now",
  });
}

export default async function NowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("now");
  const doing = t.raw("doing") as string[];
  const shipped = t.raw("shipped") as string[];
  const not = t.raw("not") as string[];

  return (
    <main className="relative min-h-screen">
      <Navbar />
      <PageHero label={t("label")} title={t("title")} description={t("subtitle")} />
      <div className="site-content space-y-10 pb-24">
        <p className="text-sm text-[var(--text-muted)]">
          {t("updated", { date: NOW_UPDATED })}
        </p>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">{t("doingTitle")}</h2>
          <ul className="list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
            {doing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">{t("shippedTitle")}</h2>
          <ul className="list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
            {shipped.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">{t("notTitle")}</h2>
          <ul className="list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
            {not.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
