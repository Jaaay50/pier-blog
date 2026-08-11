// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { CurrentsListItem } from "@/lib/currents/types";
import { CurrentsTimeline } from "./CurrentsTimeline";

vi.mock("./CurrentsCard", () => ({
  CurrentsCard: ({ item }: { item: CurrentsListItem }) => <div>{item.title}</div>,
}));

const item: CurrentsListItem = {
  id: "item-1",
  title: "测试资讯",
  summary: null,
  reason: null,
  category: "industry",
  score: 76,
  tags: null,
  imageUrl: null,
  author: null,
  sourceId: null,
  canonicalUrl: null,
  publishedAt: "2026-08-11T04:00:00.000Z",
  isFeatured: false,
};

describe("CurrentsTimeline", () => {
  it("日期标题留在内容流并使用透明页面背景", () => {
    render(
      <NextIntlClientProvider
        locale="zh"
        messages={{ currents: { unknownDate: "未知日期", itemsCount: "{count} 条" } }}
      >
        <CurrentsTimeline items={[item]} sources={new Map()} />
      </NextIntlClientProvider>,
    );

    const header = screen.getByRole("heading", { name: "8月11日" }).closest("header");
    expect(header?.className).not.toContain("sticky");
    expect(header?.className).not.toContain("currents-surface-sticky");
  });
});
