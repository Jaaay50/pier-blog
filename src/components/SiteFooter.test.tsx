// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import { SiteFooter } from "./SiteFooter";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("SiteFooter", () => {
  it("只把站内导航包成 nav，Cloudborne 留在品牌外链列", () => {
    render(
      <NextIntlClientProvider locale="zh" messages={zh}>
        <SiteFooter />
      </NextIntlClientProvider>,
    );

    const navs = screen.getAllByRole("navigation");
    expect(navs).toHaveLength(1);
    expect(navs[0].getAttribute("aria-label")).toBe("导航");
    expect(navs[0].textContent).not.toMatch(/Cloudborne/);

    const cloudborne = screen.getByRole("link", { name: /Cloudborne 独立站/ });
    expect(cloudborne.getAttribute("href")).toBe("https://cloudborne.cn");
    expect(cloudborne.getAttribute("target")).toBe("_blank");
    expect(cloudborne.getAttribute("rel")).toBe("noopener noreferrer");
    expect(cloudborne.textContent).toBe("Cloudborne 独立站 ↗");
    expect(cloudborne.className).toContain("min-h-11");
  });
});
