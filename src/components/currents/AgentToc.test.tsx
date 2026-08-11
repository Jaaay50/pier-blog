// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentToc } from "./AgentToc";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("AgentToc", () => {
  it("按阅读位置标记当前章节并保留 locale-neutral 内部路径", () => {
    let configureTop = 600;
    const understand = document.createElement("section");
    understand.id = "understand";
    understand.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const configure = document.createElement("section");
    configure.id = "configure";
    configure.getBoundingClientRect = () => ({ top: configureTop }) as DOMRect;
    document.body.append(understand, configure);

    render(
      <AgentToc
        title="本页内容"
        items={[
          { id: "understand", label: "理解接入" },
          { id: "configure", label: "配置" },
        ]}
        quickTitle="快速接入"
        quickLinks={[{ href: "/feedback?category=agent_access", label: "提交反馈" }]}
      />,
    );

    expect(screen.getByRole("link", { name: "理解接入" }).getAttribute("aria-current")).toBe(
      "location",
    );
    expect(screen.getByRole("link", { name: "提交反馈" }).getAttribute("href")).toBe(
      "/feedback?category=agent_access",
    );
    expect(screen.getByRole("navigation", { name: "本页内容" }).querySelector("ul")?.className)
      .toContain("scrollbar-none");

    configureTop = 100;
    fireEvent.scroll(window);
    expect(screen.getByRole("link", { name: "配置" }).getAttribute("aria-current")).toBe(
      "location",
    );
  });
});
