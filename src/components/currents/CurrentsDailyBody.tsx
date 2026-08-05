"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
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
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="mb-6">
        <Link href="/currents" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {labels.back}
        </Link>
      </div>

      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.dailyTitle}</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{dateLabel}</h1>
      </header>

      {/* 头条 */}
      {report.lead && (
        <Link href={`/currents/${report.lead.id}`} className="card-glass card-glass-hover mb-10 block rounded-xl p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Lead</p>
          <h2 className="text-xl font-semibold leading-snug tracking-tight">{report.lead.title}</h2>
          {report.lead.paragraph && (
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{report.lead.paragraph}</p>
          )}
        </Link>
      )}

      {/* 分节 */}
      {report.sections.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{labels.empty}</p>
      ) : (
        report.sections.map((section) => (
          <section key={section.key} className="mb-10">
            <h2 className="mb-4 border-b border-[var(--border)] pb-2 text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {section.label}
            </h2>
            <ul className="space-y-4">
              {section.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/currents/${item.id}`} className="group flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{item.summary}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{item.sourceName}</p>
                    </div>
                    <ScoreBadge score={item.score} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* 归档 */}
      {archive.length > 0 && (
        <section className="mt-14 border-t border-[var(--border)] pt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">{labels.dailyArchive}</h2>
          <ul className="space-y-2">
            {archive.map((d) => (
              <li key={d.date}>
                <Link href={`/currents/daily/${d.date}`} className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  {d.date}
                </Link>
                {d.leadTitle && <span className="ml-2 text-xs text-[var(--text-muted)] line-clamp-1">{d.leadTitle}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
