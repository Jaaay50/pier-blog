import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { LabClientContent } from "@/components/lab/LabClientContent";
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
  const t = await getTranslations({ locale, namespace: "lab" });
  return pageMetadata(locale, {
    title: t("title"),
    description: t("subtitle"),
    path: "/lab",
  });
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("lab");

  return (
    <main className="relative min-h-screen">
      <Navbar />
      <div className="site-content py-16">
        <header className="mb-12 text-center">
          <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
            {t("subtitle")}
          </p>
        </header>
        <LabClientContent />
      </div>
      <SiteFooter />
    </main>
  );
}
