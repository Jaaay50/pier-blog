import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { LabClientContent } from "@/components/lab/LabClientContent";
import { locales } from "@/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
      <div className="mx-auto max-w-6xl px-6 py-16">
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
