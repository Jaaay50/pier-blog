import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { GuestbookBoard } from "@/components/guestbook/GuestbookBoard";
import { locales } from "@/i18n/config";
import { fetchGuestbookEntries, type GuestbookEntry } from "@/lib/guestbook";
import { pageMetadata } from "@/lib/metadata";

export const revalidate = 15;
/** 首屏列表条数。超出部分由画布/列表之外的分页承担（见 GuestbookBoard 的 count 文案）。 */
const INITIAL_LIMIT = 50;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guestbook" });
  return pageMetadata(locale, {
    title: t("title"),
    description: t("metaDescription"),
    path: "/guestbook",
  });
}

export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let initialEntries: GuestbookEntry[] = [];
  let initialError = false;
  try {
    const result = await fetchGuestbookEntries({ limit: INITIAL_LIMIT, revalidate });
    initialEntries = result.entries;
  } catch {
    initialError = true;
  }

  return (
    <main className="relative min-h-screen">
      <Navbar />
      <div className="site-content pb-16 pt-8 md:pt-12">
        <GuestbookBoard locale={locale} initialEntries={initialEntries} initialError={initialError} />
      </div>
      <SiteFooter />
    </main>
  );
}
