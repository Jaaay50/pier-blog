// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityHeatmap } from "./ActivityHeatmap";

vi.mock("motion/react", () => ({
  motion: {
    span: ({ children, ...props }: React.ComponentProps<"span">) => <span {...props}>{children}</span>,
  },
  useInView: () => true,
}));

afterEach(() => {
  cleanup();
});

describe("ActivityHeatmap", () => {
  it("文章不足时显示空状态文案", () => {
    render(
      <ActivityHeatmap
        postDates={[]}
        emptyMessage="发布更多文章后，这里会显示写作活跃度。"
      />,
    );
    expect(screen.getByText("发布更多文章后，这里会显示写作活跃度。")).toBeTruthy();
  });

  it("少量文章时显示计数说明而不是热力图", () => {
    render(
      <ActivityHeatmap
        postDates={["2026-08-01", "2026-08-08"]}
        countMessage="目前已发布 2 篇文章，文章库增长后会显示更多活动。"
      />,
    );
    expect(screen.getByText("目前已发布 2 篇文章，文章库增长后会显示更多活动。")).toBeTruthy();
  });
});
