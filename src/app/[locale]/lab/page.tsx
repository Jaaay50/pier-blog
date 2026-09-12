import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { LabGallery } from "@/components/lab/LabGallery";
import { LabTerminal } from "@/components/lab/LabTerminal";
import { locales } from "@/i18n/config";
import { ogCardUrl, pageMetadata } from "@/lib/metadata";

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
    description: t("metaDescription"),
    path: "/lab",
    image: ogCardUrl("lab", locale),
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
      <PageHero label={t("label")} title={t("title")} description={t("subtitle")} />
      <div className="site-content pb-16 pt-10 md:pt-16">
        <LabGallery />
      </div>
      <LabTerminal />
      <SiteFooter />
    </main>
  );
}
