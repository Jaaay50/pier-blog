import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { isValidCurrentsDailyDate, serverFetchDailyByDate } from "@/lib/currents/api";
import { CurrentsDailyBody } from "@/components/currents/CurrentsDailyBody";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const SITE_URL = "https://ethanpier.com";

interface PageProps {
  params: Promise<{ locale: string; date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, date } = await params;
  // 非法/非真实日历日期不触发上游请求（页面体同步 404）
  if (!isValidCurrentsDailyDate(date)) return {};
  const t = await getTranslations({ locale, namespace: "currents" });
  // generateMetadata 中的取数异常不应阻塞 metadata 输出；catch 后回退默认 description。
  let report: Awaited<ReturnType<typeof serverFetchDailyByDate>> = null;
  try {
    report = await serverFetchDailyByDate(date, locale);
  } catch {
    // 页面体会同步触发相同请求并正确抛出 → error.tsx；metadata 不二次抛出。
  }
  const title = `${t("dailyTitle")} ${date} — 潮汐 · Currents`;
  const description = report?.lead?.title ?? t("subtitle");
  const canonicalUrl = `${SITE_URL}/${locale}/currents/daily/${date}`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}/en/currents/daily/${date}`,
        zh: `${SITE_URL}/zh/currents/daily/${date}`,
        "x-default": `${SITE_URL}/en/currents/daily/${date}`,
      },
    },
    openGraph: { title, description, type: "article", url: canonicalUrl, locale: locale === "zh" ? "zh_CN" : "en_US" },
  };
}

export default async function CurrentsDailyDatePage({ params }: PageProps) {
  const { locale, date } = await params;
  setRequestLocale(locale);
  // 格式 + 真实日历日期（拒绝 2026-02-30 这类值），非法输入不消耗上游请求
  if (!isValidCurrentsDailyDate(date)) notFound();
  const t = await getTranslations("currents");
  const report = await serverFetchDailyByDate(date, locale);
  // serverFetchDailyByDate 严格语义：null = 404（真实不存在），throw = 可重试故障
  if (!report) notFound();

  return (
    <>
      <CurrentsDailyBody
        report={report}
        locale={locale}
        labels={{
          dailyTitle: t("dailyTitle"),
          latestDaily: t("latestDaily"),
          dailyArchive: t("dailyArchive"),
          back: t("backToCurrents"),
          readOriginal: t("readOriginal"),
          empty: t("empty"),
        }}
      />
    </>
  );
}
