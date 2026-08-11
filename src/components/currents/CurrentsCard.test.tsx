// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { CurrentsListItem } from "@/lib/currents/types";
import { CurrentsCard } from "./CurrentsCard";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("./FavoriteButton", () => ({
  FavoriteButton: () => <span data-testid="favorite" />,
}));

vi.mock("@/lib/currents/useReadState", () => ({
  useIsRead: () => false,
}));

const item: CurrentsListItem = {
  id: "item-1",
  title: "多信源资讯",
  summary: "摘要",
  reason: null,
  category: "industry",
  score: 76,
  tags: null,
  imageUrl: null,
  author: null,
  sourceId: "source-1",
  canonicalUrl: null,
  publishedAt: "2026-08-11T04:00:00.000Z",
  isFeatured: false,
  sourceCount: 3,
};

describe("CurrentsCard", () => {
  it("没有推荐理由和标签时仍显示多信源计数", () => {
    render(
      <NextIntlClientProvider
        locale="zh"
        messages={{ currents: { read: "已读", featured: "精选", sourcesCount: "{count} 个信源" } }}
      >
        <CurrentsCard item={item} sourceName="测试信源" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("3 个信源")).toBeTruthy();
  });
});
