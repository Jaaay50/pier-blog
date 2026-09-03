// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentsServerFeed } from "./CurrentsServerFeed";
import type { CurrentsListItem } from "@/lib/currents/types";

const item: CurrentsListItem = {
  id: "item-ssr-1",
  title: "服务端直出的资讯",
  summary: "摘要应出现在无脚本 HTML 里。",
  reason: null,
  category: "industry",
  score: 88,
  tags: null,
  imageUrl: null,
  author: null,
  sourceId: "openai-news",
  canonicalUrl: null,
  publishedAt: "2026-09-03T01:00:00.000Z",
  isFeatured: true,
};

describe("CurrentsServerFeed", () => {
  it("renders real article links for crawlers", () => {
    render(
      <CurrentsServerFeed
        locale="zh"
        items={[item]}
        sources={[{ id: "openai-news", name: "OpenAI News", nameZh: "OpenAI 新闻", type: "rss", homepageUrl: null }]}
      />,
    );
    const link = screen.getByRole("link", { name: "服务端直出的资讯" });
    expect(link.getAttribute("href")).toBe("/zh/currents/item-ssr-1");
    expect(screen.getByText("摘要应出现在无脚本 HTML 里。")).toBeTruthy();
    expect(screen.getByText(/OpenAI 新闻/)).toBeTruthy();
  });
});
