import { fmtHeatChartTime } from "@/lib/currents/format-time";
import type { CurrentsEventHeatHistory, CurrentsEventHeatPoint } from "@/lib/currents/types";

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 34, left: 40 };
const PLOT_WIDTH = WIDTH - PAD.left - PAD.right;
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom;

export interface EventHeatChartLabels {
  title: string;
  subtitle: string;
  empty: string;
  single: string; // __TIME__
  now: string;
  ago24h: string;
  point: string; // __TIME__ / __HEAT__
  accessibleSummary: string; // __COUNT__ / __PEAK__ / __PEAK_TIME__ / __LATEST__
}

interface ChartPoint extends CurrentsEventHeatPoint {
  x: number;
  y: number;
}

function chartPoints(history: CurrentsEventHeatHistory): { points: ChartPoint[]; maxHeat: number } {
  const start = Date.parse(history.windowStart);
  const end = Date.parse(history.windowEnd);
  const span = Math.max(1, end - start);
  const maxHeat = Math.max(1, ...history.points.map((point) => point.heat));
  return {
    maxHeat,
    points: history.points.map((point) => ({
      ...point,
      x: PAD.left + ((Date.parse(point.bucketStart) - start) / span) * PLOT_WIDTH,
      y: PAD.top + PLOT_HEIGHT - (point.heat / maxHeat) * PLOT_HEIGHT,
    })),
  };
}

function splitContiguousPoints(points: ChartPoint[], bucketHours: number): ChartPoint[][] {
  const maxGap = bucketHours * 3600 * 1000 + 1000;
  const segments: ChartPoint[][] = [];
  for (const point of points) {
    const current = segments.at(-1);
    const previous = current?.at(-1);
    if (!current || !previous || Date.parse(point.bucketStart) - Date.parse(previous.bucketStart) > maxGap) {
      segments.push([point]);
    } else {
      current.push(point);
    }
  }
  return segments;
}

function interpolateMonotone(points: ChartPoint[]): string {
  if (points.length < 2) return "";
  const parts = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const middle = (previous.x + current.x) / 2;
    parts.push(
      `C ${middle.toFixed(2)} ${previous.y.toFixed(2)}, ${middle.toFixed(2)} ${current.y.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`,
    );
  }
  return parts.join(" ");
}

export function EventHeatChart({
  history,
  locale,
  labels,
}: {
  history: CurrentsEventHeatHistory;
  locale: string;
  labels: EventHeatChartLabels;
}) {
  const { points, maxHeat } = chartPoints(history);
  const segments = splitContiguousPoints(points, history.bucketHours);
  const peak = points.reduce<ChartPoint | null>(
    (current, point) => (!current || point.heat > current.heat ? point : current),
    null,
  );
  const latest = points.at(-1) ?? null;
  const summary = peak && latest
    ? labels.accessibleSummary
        .replace("__COUNT__", String(points.length))
        .replace("__PEAK__", String(peak.heat))
        .replace("__PEAK_TIME__", fmtHeatChartTime(peak.bucketStart, locale))
        .replace("__LATEST__", String(latest.heat))
    : labels.empty;

  return (
    <section className="card-glass mb-8 rounded-xl p-4 sm:p-5" aria-labelledby="event-heat-chart-title">
      <div className="mb-4">
        <h2 id="event-heat-chart-title" className="font-display text-lg font-semibold tracking-tight">
          {labels.title}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">{labels.subtitle}</p>
      </div>

      <p className="sr-only">{summary}</p>

      {points.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-5 text-center text-[13px] text-[var(--text-muted)]">
          {labels.empty}
        </div>
      ) : points.length === 1 ? (
        <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-5 text-center">
          <span className="mb-1 text-2xl font-semibold tabular-nums text-[var(--accent)]">{points[0].heat}</span>
          <span className="text-[12px] text-[var(--text-muted)]">
            {labels.single.replace("__TIME__", fmtHeatChartTime(points[0].bucketStart, locale))}
          </span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg">
          <svg
            className="event-heat-chart block h-auto w-full"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-labelledby="event-heat-chart-title event-heat-chart-desc"
          >
            <desc id="event-heat-chart-desc">{summary}</desc>
            <defs>
              <linearGradient id="event-heat-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((fraction) => {
              const y = PAD.top + PLOT_HEIGHT * fraction;
              const value = maxHeat * (1 - fraction);
              return (
                <g key={fraction}>
                  <line
                    x1={PAD.left}
                    x2={WIDTH - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="10"
                    className="tabular-nums"
                  >
                    {Number(value.toFixed(1))}
                  </text>
                </g>
              );
            })}

            {segments.map((segment) => {
              if (segment.length < 2) return null;
              const path = interpolateMonotone(segment);
              return (
                <g key={segment[0].bucketStart}>
                  <path
                    className="event-heat-area"
                    d={`${path} L ${segment.at(-1)!.x.toFixed(2)} ${(PAD.top + PLOT_HEIGHT).toFixed(2)} L ${segment[0].x.toFixed(2)} ${(PAD.top + PLOT_HEIGHT).toFixed(2)} Z`}
                    fill="url(#event-heat-area)"
                  />
                  <path
                    className="event-heat-line"
                    d={path}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength="1"
                  />
                </g>
              );
            })}

            {points.map((point) => {
              const label = labels.point
                .replace("__TIME__", fmtHeatChartTime(point.bucketStart, locale))
                .replace("__HEAT__", String(point.heat));
              return (
                <g key={point.bucketStart}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="9"
                    fill="transparent"
                    stroke="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={label}
                  >
                    <title>{label}</title>
                  </circle>
                  <circle
                    className="event-heat-dot"
                    cx={point.x}
                    cy={point.y}
                    r="3.5"
                    fill="var(--bg-primary)"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    pointerEvents="none"
                  />
                </g>
              );
            })}

            <text x={PAD.left} y={HEIGHT - 8} fill="var(--text-muted)" fontSize="10">
              {labels.ago24h}
            </text>
            <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" fill="var(--text-muted)" fontSize="10">
              {labels.now}
            </text>
          </svg>
        </div>
      )}

      {points.length > 1 && (
        <ol className="sr-only">
          {points.map((point) => (
            <li key={point.bucketStart}>
              {labels.point
                .replace("__TIME__", fmtHeatChartTime(point.bucketStart, locale))
                .replace("__HEAT__", String(point.heat))}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
