"use client";

import { useEffect, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import type { CurrentsDailyReport } from "@/lib/currents/types";
import { fetchDailyArchive } from "@/lib/currents/api";
import { ScoreBadge } from "./ScoreBadge";

interface Labels {
  dailyTitle: string;
  latestDaily: string;
  dailyArchive: string;
  back: string;
  readOriginal: string;
  empty: string;
}

interface Props {
  report: CurrentsDailyReport;
  locale: string;
  labels: Labels;
}

export function CurrentsDailyBody({ report, locale, labels }: Props) {
  const [archive, setArchive] = useState<Array<{ date: string; leadTitle: string | null }>>([]);

  useEffect(() => {
    fetchDailyArchive(locale, 30)
      .then((res) => setArchive(res.dailies.filter((d) => d.date !== report.date)))
      .catch(() => setArchive([]));
  }, [locale, report.date]);

  const dateLabel = new Date(`${report.date}T12:00:00`).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "long", day: "numeric", weekday: "long" },
  );

  return (
    <div className="max-w-[1020px] py-14">
      <div className="mb-6">
        <TransitionLink href="/currents" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {labels.back}
        </TransitionLink>
      </div>

      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.dailyTitle}</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{dateLabel}</h1>
        {report.sections.length > 0 && (
          <nav aria-label={labels.dailyTitle} className="scrollbar-none -mx-1 mt-5 overflow-x-auto pb-1">
            <ul className="flex w-max gap-1 px-1">
              {report.sections.map((section) => (
                <li key={section.key}>
                  <a
                    href={`#daily-section-${section.key}`}
                    className="block whitespace-nowrap rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {/* 头条 */}
      {report.lead && (
        <TransitionLink href={`/currents/${report.lead.id}`} className="currents-surface-highlight mb-12 block rounded-xl p-6 md:p-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Lead</p>
          <h2 className="font-display text-xl font-semibold leading-snug tracking-tight md:text-2xl">{report.lead.title}</h2>
          {report.lead.paragraph && (
            <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">{report.lead.paragraph}</p>
          )}
        </TransitionLink>
      )}

      {/* 分节 */}
      {report.sections.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{labels.empty}</p>
      ) : (
        report.sections.map((section) => (
          <section key={section.key} id={`daily-section-${section.key}`} className="mb-14 scroll-mt-24">
            <h2 className="font-display mb-6 border-b border-[var(--border)] pb-3 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {section.label}
            </h2>
            <ul className="divide-y divide-[var(--border)]">
              {section.items.map((item) => (
                <li key={item.id}>
                  <TransitionLink href={`/currents/${item.id}`} className="group block py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                    <h3 className="text-[15px] font-medium leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">{item.summary}</p>
                    <p className="mt-2.5 flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                      <span>{item.sourceName}</span>
                      <span aria-hidden className="opacity-50">·</span>
                      <ScoreBadge score={item.score} />
                    </p>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* 归档 */}
      {archive.length > 0 && (
        <section className="mt-16 border-t border-[var(--border)] pt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.dailyArchive}</h2>
          <ul className="space-y-2">
            {archive.map((d) => (
              <li key={d.date}>
                <TransitionLink href={`/currents/daily/${d.date}`} className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  {d.date}
                </TransitionLink>
                {d.leadTitle && <span className="ml-2 text-xs text-[var(--text-muted)] line-clamp-1">{d.leadTitle}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
