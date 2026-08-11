"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { fmtDateTime, fmtTime } from "@/lib/currents/format-time";
import { EventHeatChart, type EventHeatChartLabels } from "./EventHeatChart";
import { FeedbackForm, type FeedbackLabels } from "./FeedbackForm";
import type {
  CurrentsEventDetail,
  CurrentsEventReportRole,
  CurrentsEventTimelineEntry,
  CurrentsHotStatus,
} from "@/lib/currents/types";

interface EventPageLabels {
  back: string;
  timeline: string;
  timelineSubtitle: string;
  representative: string;
  readOriginal: string;
  firstSeen: string;
  latestActivity: string;
  heat: string;
  reports: string;
  official: string;
  community: string; // 已由服务端把 ICU 参数转为 __SCORE__ / __COMMENTS__ 模板
  confidenceHigh: string;
  confidenceLow: string;
  sameOrg: string;
  notIndependent: string;
  typeNews: string;
  typeProduct: string;
  typeResearch: string;
  statusLabels: Record<CurrentsHotStatus, string>;
  roleLabels: Record<CurrentsEventReportRole, string>;
  splitParent: string;
  splitChildren: string;
  untitled: string;
  heatChart: EventHeatChartLabels;
  feedback: FeedbackLabels;
}

/** 生命周期标签色阶（与热点页 HotCard 保持一致） */
const STATUS_CLASS: Record<CurrentsHotStatus, string> = {
  new: "border-[var(--border)] text-[var(--text-muted)]",
  rising: "border-[var(--accent)]/40 text-[var(--accent)]/80",
  peak: "score-badge-high border-[var(--accent)]/60 font-semibold text-[var(--accent)]",
  cooling: "border-[var(--border-hover)] text-[var(--text-secondary)]",
  ended: "border-[var(--border)] text-[var(--text-muted)]",
  active: "border-[var(--border)] text-[var(--text-muted)]",
};

const ROLE_CLASS: Record<CurrentsEventReportRole, string> = {
  official: "border-[var(--accent)]/50 text-[var(--accent)]",
  media: "border-[var(--border-hover)] text-[var(--text-secondary)]",
  community: "border-[var(--border)] text-[var(--text-muted)]",
  aggregator: "border-[var(--border)] text-[var(--text-muted)] opacity-80",
};

function TimelineEntry({
  entry,
  locale,
  labels,
}: {
  entry: CurrentsEventTimelineEntry;
  locale: string;
  labels: EventPageLabels;
}) {
  const title = entry.title ?? labels.untitled;
  return (
    <li className="relative pb-5 last:pb-0">
      <span
        aria-hidden
        className="currents-tl-node absolute -left-4 top-1.5 -translate-x-1/2 sm:-left-5"
      />
      <div className="card-glass rounded-xl p-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_CLASS[entry.sourceRole]}`}
          >
            {labels.roleLabels[entry.sourceRole]}
          </span>
          <span className="font-medium text-[var(--text-secondary)]">{entry.sourceName}</span>
          <span className="tabular-nums opacity-70">{fmtTime(entry.publishedAt, locale)}</span>
          {!entry.countsAsIndependent && (
            <span className="rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-[10px]">
              {entry.sourceRole === "official" || entry.sourceRole === "media"
                ? labels.sameOrg
                : labels.notIndependent}
            </span>
          )}
          {(entry.communityScore != null || entry.communityComments != null) && (
            <span className="tabular-nums">
              {labels.community
                .replace("__SCORE__", String(entry.communityScore ?? 0))
                .replace("__COMMENTS__", String(entry.communityComments ?? 0))}
            </span>
          )}
          {entry.isRepresentative && (
            <span className="rounded-full border border-[var(--accent)]/40 px-2 py-0.5 text-[10px] text-[var(--accent)]/80">
              {labels.representative}
            </span>
          )}
        </div>
        {entry.url ? (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium leading-snug text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
          >
            {title}
          </a>
        ) : (
          <p className="text-[14px] font-medium leading-snug text-[var(--text-primary)]">{title}</p>
        )}
      </div>
    </li>
  );
}

export function CurrentsEventBody({
  event,
  locale,
  labels,
}: {
  event: CurrentsEventDetail;
  locale: string;
  labels: EventPageLabels;
}) {
  const router = useRouter();
  const typeLabel =
    event.eventType === "news"
      ? labels.typeNews
      : event.eventType === "product"
        ? labels.typeProduct
        : labels.typeResearch;

  return (
    <div className="mx-auto max-w-3xl pb-14 pt-14">
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) router.back();
          else router.push("/currents/hot");
        }}
        className="mb-6 text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        ← {labels.back}
      </button>

      {/* 头部：状态 / 类型 / 置信 / 热度 */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[event.status]}`}
        >
          {labels.statusLabels[event.status]}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px]">
          {typeLabel}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px]">
          {event.confidence === "high" ? labels.confidenceHigh : labels.confidenceLow}
        </span>
        <span className="tabular-nums">{labels.reports}</span>
        {event.officialReportCount > 0 && (
          <span className="tabular-nums">{labels.official}</span>
        )}
        <span
          className="ml-auto shrink-0 rounded-full border border-[var(--accent)]/50 px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-[var(--accent)]"
          aria-label={`${labels.heat} ${event.heat}`}
        >
          {event.heat}
        </span>
      </div>

      <h1 className="font-display mb-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {event.title ?? labels.untitled}
      </h1>

      <div className="mb-6 flex flex-wrap gap-x-5 gap-y-1 text-[12px] tabular-nums text-[var(--text-muted)]">
        <span>
          {labels.firstSeen} · {fmtDateTime(event.firstSeenAt, locale)}
        </span>
        <span>
          {labels.latestActivity} · {fmtDateTime(event.latestActivityAt, locale)}
        </span>
      </div>

      {event.progress && (
        <p className="card-glass mb-3 rounded-xl p-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {event.progress}
        </p>
      )}
      {event.summary && (
        <p className="mb-8 text-[14px] leading-relaxed text-[var(--text-muted)]">{event.summary}</p>
      )}

      {/* 最近 24h 事件热度：只展示后端真实持久化快照，与资讯推荐分明确分离 */}
      <EventHeatChart history={event.heatHistory} locale={locale} labels={labels.heatChart} />

      {/* split 谱系：子事件可独立访问，不被解析回父事件 */}
      {(event.splitParent || event.splitChildren.length > 0) && (
        <div className="mb-8 rounded-xl border border-dashed border-[var(--border)] p-4 text-[13px] text-[var(--text-muted)]">
          {event.splitParent && (
            <p>
              {labels.splitParent}{" "}
              <Link
                href={`/currents/events/${event.splitParent}`}
                className="text-[var(--accent)] hover:underline"
              >
                {event.splitParent}
              </Link>
            </p>
          )}
          {event.splitChildren.length > 0 && (
            <p>
              {labels.splitChildren}{" "}
              {event.splitChildren.map((id, i) => (
                <span key={id}>
                  {i > 0 && " · "}
                  <Link href={`/currents/events/${id}`} className="text-[var(--accent)] hover:underline">
                    {id}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/* 报道时间线：时间正序单轨，角色徽章区分官方/媒体/社区/聚合 */}
      <section aria-label={labels.timeline}>
        <h2 className="font-display mb-1 border-b border-[var(--border)] pb-2 text-lg font-semibold tracking-tight">
          {labels.timeline}
        </h2>
        <p className="mb-5 text-[13px] text-[var(--text-muted)]">{labels.timelineSubtitle}</p>
        <ol className="currents-tl-items relative border-l border-[var(--border)] pl-4 sm:pl-5">
          {event.timeline.map((entry) => (
            <TimelineEntry
              key={`${entry.itemId}-${entry.sourceId}`}
              entry={entry}
              locale={locale}
              labels={labels}
            />
          ))}
        </ol>
      </section>

      {/* 阶段 A：独立反馈入口（事件页末尾，落库时后端会把 merge 旧 ID 解析为规范事件 ID） */}
      <FeedbackForm targetType="event" targetId={event.eventId} locale={locale} labels={labels.feedback} />
    </div>
  );
}
