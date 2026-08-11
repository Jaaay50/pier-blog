// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDailyArchive } from "@/lib/currents/api";
import type { CurrentsDailyReport } from "@/lib/currents/types";
import { CurrentsDailyBody } from "./CurrentsDailyBody";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/currents/api", () => ({
  fetchDailyArchive: vi.fn(),
}));

const archiveMock = vi.mocked(fetchDailyArchive);

afterEach(() => cleanup());

describe("CurrentsDailyBody", () => {
  it("移动端分类导航隐藏原生滚动条并链接到对应章节", () => {
    archiveMock.mockResolvedValue({ dailies: [], generatedAt: "2026-08-11T00:00:00Z" });
    const report: CurrentsDailyReport = {
      date: "2026-08-11",
      generatedAt: "2026-08-11T00:00:00Z",
      finalized: true,
      itemCount: 1,
      lead: null,
      sections: [
        {
          key: "models",
          label: "模型发布/更新",
          items: [
            {
              id: "item-1",
              title: "模型更新",
              summary: "摘要",
              score: 82,
              canonicalUrl: null,
              sourceName: "source",
            },
          ],
        },
      ],
    };

    render(
      <CurrentsDailyBody
        report={report}
        locale="zh"
        labels={{
          dailyTitle: "潮汐日报",
          latestDaily: "最新日报",
          dailyArchive: "更早的日报",
          back: "返回潮汐",
          readOriginal: "阅读原文",
          empty: "暂无内容",
        }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "潮汐日报" });
    expect(nav.className).toContain("scrollbar-none");
    expect(screen.getByRole("link", { name: "模型发布/更新" }).getAttribute("href")).toBe(
      "#daily-section-models",
    );
    expect(document.getElementById("daily-section-models")).toBeTruthy();
  });
});
