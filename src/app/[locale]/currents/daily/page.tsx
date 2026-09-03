import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { serverFetchDailyLatest } from "@/lib/currents/api";
import { CurrentsDailyBody } from "@/components/currents/CurrentsDailyBody";
import { currentsTitleSuffix, pageMetadata } from "@/lib/metadata";

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "currents" });
  // generateMetadata 中的取数异常不应阻塞 metadata 输出；catch 后回退默认 description。
  let report: Awaited<ReturnType<typeof serverFetchDailyLatest>> = null;
  try {
    report = await serverFetchDailyLatest(locale);
  } catch {
    // 页面体会同步触发相同请求并正确抛出 → error.tsx；metadata 不二次抛出。
  }
  return pageMetadata(locale, {
    title: t("dailyTitle"),
    description: report?.lead?.title ?? t("subtitle"),
    path: "/currents/daily",
    type: "article",
    titleSuffix: currentsTitleSuffix(locale),
  });
}

export default async function CurrentsDailyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("currents");
  const report = await serverFetchDailyLatest(locale);
  // serverFetchDailyLatest 严格语义：null = 404（真实不存在），throw = 可重试故障
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
