import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { CurrentsTopicDetailClient } from "@/components/currents/CurrentsTopicDetailClient";
import { CURRENTS_TOPIC_IDS } from "@/lib/currents/topics";

/** topicId 必须属于现有主题集合；其余输入不反射进 metadata，直接 404。 */
function isKnownTopicId(topicId: string): boolean {
  return (CURRENTS_TOPIC_IDS as readonly string[]).includes(topicId);
}

export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // 主题页运行时按需生成
}

const SITE_URL = "https://ethanpier.com";

interface PageProps {
  params: Promise<{ locale: string; topicId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, topicId } = await params;
  // 未知主题不生成 metadata（页面体同步 404），阻断任意文本反射进 title/canonical
  if (!isKnownTopicId(topicId)) return {};
  const t = await getTranslations({ locale, namespace: "currents" });
  const canonical = `${SITE_URL}/${locale}/currents/topics/${encodeURIComponent(topicId)}`;

  return {
    title: `${topicId} — ${t("topicsTitle")} · Pier`,
    description: t("topicsSubtitle"),
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/en/currents/topics/${encodeURIComponent(topicId)}`,
        zh: `${SITE_URL}/zh/currents/topics/${encodeURIComponent(topicId)}`,
        "x-default": `${SITE_URL}/en/currents/topics/${encodeURIComponent(topicId)}`,
      },
    },
    openGraph: {
      title: `${topicId} — ${t("topicsTitle")}`,
      description: t("topicsSubtitle"),
      type: "website",
      url: canonical,
    },
  };
}

/** 潮汐 · 主题详情 — ISR 壳 + 客户端数据岛（复用时间线组件） */
export default async function CurrentsTopicDetailPage({ params }: PageProps) {
  const { locale, topicId } = await params;
  setRequestLocale(locale);
  // topicId 白名单校验：未知主题 404，不挂载客户端数据岛（不产生上游请求）
  if (!isKnownTopicId(topicId)) notFound();

  return (
    <div className="pt-14">
      <CurrentsTopicDetailClient topicId={topicId} />
    </div>
  );
}
