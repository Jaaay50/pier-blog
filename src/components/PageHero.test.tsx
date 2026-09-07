// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageHero } from "./PageHero";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

vi.mock("@/components/webgl/FluidBackground", () => ({
  FluidBackground: ({ intensity, speed, className }: { intensity: number; speed: number; className: string }) => (
    <div aria-hidden="true" data-intensity={intensity} data-speed={speed} className={className} />
  ),
}));

afterEach(cleanup);

describe("PageHero", () => {
  for (const [locale, messages] of Object.entries({ zh, en })) {
    const entries = [
      [messages.blog.label, messages.blog.title, messages.blog.subtitle],
      [messages.currentsNav.brandTagline, messages.currents.title, messages.currents.subtitle],
      [messages.portfolio.label, messages.portfolio.title, messages.portfolio.subtitle],
      [messages.lab.label, messages.lab.title, messages.lab.subtitle],
      [messages.about.label, messages.about.title, messages.about.intro],
    ];
    it.each(entries)(`${locale}: renders %s with one readable server heading`, (label, title, description) => {
      const markup = renderToStaticMarkup(<PageHero label={label} title={title} description={description} />);
      const { container } = render(<PageHero label={label} title={title} description={description} />);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
      expect(markup).toContain(title);
      const serverDocument = new DOMParser().parseFromString(markup, "text/html");
      expect(serverDocument.body.textContent).toContain(description);
      const intro = container.querySelector(".site-content > p:last-child");
      expect(intro?.className).toContain("min-h-[6lh]");
      expect(intro?.className).toContain("min-[360px]:min-h-[5lh]");
      expect(intro?.className).toContain("sm:min-h-[3lh]");
      expect(intro?.className).toContain("md:min-h-[2lh]");
      expect(intro?.className).not.toMatch(/line-clamp|truncate|overflow-hidden/);
      expect(container.querySelector("h1")?.className).toContain("md:text-5xl");
      const gradient = screen.getByText(title);
      expect(gradient.className).toContain("bg-clip-text");
      expect(gradient.style.backgroundImage).toContain("var(--gradient-text-1)");
      expect(gradient.style.backgroundSize).toBe("300% 100%");
      expect(gradient.parentElement?.className).toContain("font-medium");
      expect(container.querySelector(".site-content")).toBeTruthy();
      expect(container.querySelector("header")?.className).toContain("py-12 md:py-20");
      expect(container.querySelector("[data-intensity]")?.getAttribute("data-intensity")).toBe("0.6");
      expect(container.querySelector("[data-speed]")?.getAttribute("data-speed")).toBe("0.6");
      expect(container.querySelector("a, button")).toBeNull();
    });
  }

  it("supports empty description and escapes text without injecting markup", () => {
    const html = renderToStaticMarkup(<PageHero label="" title="<script>alert(1)</script>" description="" />);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
