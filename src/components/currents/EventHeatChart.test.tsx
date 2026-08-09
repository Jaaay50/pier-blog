import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventHeatChart, type EventHeatChartLabels } from "./EventHeatChart";
import type { CurrentsEventHeatHistory, CurrentsEventHeatPoint } from "@/lib/currents/types";

const labels: EventHeatChartLabels = {
  title: "Event heat · last 24 hours",
  subtitle: "Event heat, not recommendation score.",
  empty: "No snapshots.",
  single: "Only one · __TIME__",
  now: "Now",
  ago24h: "24 hours ago",
  point: "__TIME__, event heat __HEAT__",
  accessibleSummary: "__COUNT__ snapshots; peak __PEAK__ at __PEAK_TIME__; latest __LATEST__.",
};

const base: Omit<CurrentsEventHeatHistory, "points"> = {
  windowHours: 24,
  bucketHours: 3,
  windowStart: "2026-08-09T00:00:00.000Z",
  windowEnd: "2026-08-10T00:00:00.000Z",
};

function point(bucketStart: string, heat: number): CurrentsEventHeatPoint {
  return {
    bucketStart,
    heat,
    reportHeat: heat,
    communityHeat: 0,
    independentReportCount: heat / 10,
    communityScoreMax: 0,
  };
}

function render(points: CurrentsEventHeatPoint[]): string {
  return renderToStaticMarkup(
    <EventHeatChart history={{ ...base, points }} locale="en" labels={labels} />,
  );
}

describe("EventHeatChart", () => {
  it("空数据渲染明确空态，不绘制伪造曲线", () => {
    const html = render([]);
    expect(html).toContain("No snapshots.");
    expect(html).not.toContain("event-heat-line");
  });

  it("单点渲染单点读数，不伪造趋势线", () => {
    const html = render([point("2026-08-09T21:00:00.000Z", 12.5)]);
    expect(html).toContain("12.5");
    expect(html).toContain("Only one");
    expect(html).not.toContain("event-heat-line");
  });

  it("稀疏数据不会跨缺失桶连线，仍保留每个真实点的无障碍文本", () => {
    const html = render([
      point("2026-08-09T03:00:00.000Z", 10),
      point("2026-08-09T12:00:00.000Z", 30), // 9h 缺口：新 segment
      point("2026-08-09T15:00:00.000Z", 20),
    ]);
    expect((html.match(/class="event-heat-line"/g) ?? [])).toHaveLength(1);
    expect((html.match(/tabindex="0"/g) ?? [])).toHaveLength(3);
    expect(html).toContain("3 snapshots; peak 30");
    expect(html).toContain("event heat 10");
    expect(html).toContain("event heat 30");
    expect(html).toContain("event heat 20");
  });
});
