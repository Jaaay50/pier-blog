import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { Waterline } from "@/components/Waterline";
import { TransitionLink } from "@/components/TransitionLink";
import { locales } from "@/i18n/config";
import { changelogEntries, type ChangelogItemType } from "@/lib/currents/changelog";

const SITE_URL = "https://ethanpier.com";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "changelog" });
  const title = `${t("title")} — 潮汐 · Currents`;
  const description = t("subtitle");
  const canonicalUrl = `${SITE_URL}/${locale}/currents/changelog`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${SITE_URL}/en/currents/changelog`,
        zh: `${SITE_URL}/zh/currents/changelog`,
        "x-default": `${SITE_URL}/en/currents/changelog`,
      },
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      locale: locale === "zh" ? "zh_CN" : "en_US",
    },
  };
}

const TYPE_BADGE_CLASS: Record<ChangelogItemType, string> = {
  new: "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]",
  improved: "border-[var(--border-hover)] text-[var(--text-secondary)]",
  fixed: "border-[var(--border)] text-[var(--text-muted)]",
  announced: "border-[var(--accent)]/25 text-[var(--text-secondary)]",
  removed: "border-[var(--border)] text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/60",
};

/**
 * date 语义为 Asia/Hong_Kong 日历日（见 changelog.ts）。
 * 必须显式 timeZone：UTC 构建/渲染环境下用本地时区会提前一天换日。
 */
function formatDate(date: string, locale: string): string {
  const d = new Date(`${date}T00:00:00+08:00`);
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Hong_Kong" };
  return locale === "zh"
    ? new Intl.DateTimeFormat("zh-CN", opts).format(d)
    : new Intl.DateTimeFormat("en-US", opts).format(d);
}

/**
 * 潮汐 · Currents 更新日志 — 纯静态 SSG 页面（数据在构建期内联，无运行时请求）。
 */
export default async function CurrentsChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("changelog");
  const tNav = await getTranslations("nav");
  const isZh = locale === "zh";

  return (
    <>
      {/* Header：静态 SEO 壳，h1 必须存在于构建产物 HTML */}
      <header className="mx-auto max-w-4xl pb-10 pt-14">
        <nav aria-label="breadcrumb" className="mb-6">
          <TransitionLink
            href="/currents"
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            ← {tNav("currents")}
          </TransitionLink>
        </nav>
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-[var(--text-secondary)]">{t("subtitle")}</p>
        <div className="mt-8">
          <Waterline />
        </div>
      </header>

      {/* 版本时间线 */}
      <div className="mx-auto max-w-4xl pb-16">
        <ol className="space-y-14">
          {changelogEntries.map((entry) => (
            <li key={entry.phase} className="relative border-l border-[var(--border)] pl-6 md:pl-8">
              {/* 时间轴节点 */}
              <span
                aria-hidden
                className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
              />
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time
                  dateTime={entry.date}
                  className="font-display text-xl font-semibold tracking-tight"
                >
                  {formatDate(entry.date, locale)}
                </time>
                <span className="text-sm text-[var(--text-muted)]">
                  {isZh ? entry.phaseLabelZh : entry.phaseLabelEn}
                </span>
              </div>
              {(isZh ? entry.noteZh : entry.noteEn) && (
                <p className="mb-5 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {isZh ? entry.noteZh : entry.noteEn}
                </p>
              )}
              <ul className="space-y-3">
                {entry.items.map((item) => {
                  const title = isZh ? item.titleZh : item.titleEn;
                  const desc = isZh ? item.descZh : item.descEn;
                  const typeLabel = t(`type${item.type[0].toUpperCase()}${item.type.slice(1)}`);
                  return (
                    <li key={`${entry.phase}-${item.type}-${item.titleEn}`}>
                      <article className="currents-surface-list rounded-xl p-4 md:p-5">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-4 ${TYPE_BADGE_CLASS[item.type]}`}
                          >
                            {typeLabel}
                          </span>
                          <h3 className="min-w-0 flex-1 text-[15px] font-medium leading-snug tracking-tight">
                            {title}
                          </h3>
                        </div>
                        {desc && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                            {desc}
                          </p>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>

        {/* 返回 Currents */}
        <div className="mt-14 border-t border-[var(--border)] pt-8">
          <TransitionLink
            href="/currents"
            className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
          >
            ← {t("backToCurrents")}
          </TransitionLink>
        </div>
      </div>
    </>
  );
}
