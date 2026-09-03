import type { CurrentsListItem, CurrentsSource } from "@/lib/currents/types";

interface CurrentsServerFeedProps {
  locale: string;
  items: CurrentsListItem[];
  sources: CurrentsSource[];
}

function sourceName(item: CurrentsListItem, sources: CurrentsSource[], locale: string): string | null {
  if (!item.sourceId) return null;
  const source = sources.find((s) => s.id === item.sourceId);
  if (!source) return item.sourceId;
  return locale === "zh" ? (source.nameZh ?? source.name) : source.name;
}

function timeLabel(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Hong_Kong",
  });
}

/**
 * 无脚本/爬虫首屏：真实 <article> 列表，不经过 useSearchParams。
 * 水合后由 .currents-hydrated 隐藏，交互时间线接管。
 */
export function CurrentsServerFeed({ locale, items, sources }: CurrentsServerFeedProps) {
  return (
    <ol className="currents-ssr-feed space-y-3 py-8">
      {items.map((item) => {
        const source = sourceName(item, sources, locale);
        const when = timeLabel(item.publishedAt, locale);
        return (
          <li key={item.id}>
            <article className="currents-card currents-surface-list rounded-xl p-5">
              <p className="mb-2 text-[11px] text-[var(--text-muted)]">
                {source}
                {source && when ? " · " : null}
                {when}
                {item.score != null ? ` · ${item.score}` : null}
              </p>
              <h3 className="text-base font-semibold leading-snug text-[var(--text-primary)]">
                <a href={`/${locale}/currents/${item.id}`}>{item.title}</a>
              </h3>
              {item.summary ? (
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{item.summary}</p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
