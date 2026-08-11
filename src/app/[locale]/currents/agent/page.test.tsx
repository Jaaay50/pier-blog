// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CurrentsAgentPage from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={`/zh${href}`} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => cleanup());

describe("CurrentsAgentPage", () => {
  it("所有内部反馈入口只添加一次 locale 前缀", async () => {
    render(await CurrentsAgentPage({ params: Promise.resolve({ locale: "zh" }) }));

    const feedbackLinks = screen.getAllByRole("link", { name: "feedbackCtaAction" });
    expect(feedbackLinks).toHaveLength(2);
    for (const link of feedbackLinks) {
      expect(link.getAttribute("href")).toBe("/zh/feedback?category=agent_access");
    }
  });
});
