// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeFeature } from "./HomeFeature";
import { homeEditorial, type HomeEditorial } from "@/lib/home-editorial";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => {
    // Test the native image error path without Next's image optimization runtime.
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

afterEach(cleanup);

describe("HomeFeature", () => {
  it.each(["zh", "en"])("renders %s editorial copy and stable links on the server", (locale) => {
    const html = renderToStaticMarkup(<HomeFeature locale={locale} />);
    const copy = homeEditorial.copy[locale as "zh" | "en"];
    expect(html).toContain(copy.title);
    expect(html).toContain('href="/currents/models"');
    expect(html).toContain('href="/currents/models/methodology"');
    expect(html).not.toContain("opacity-0");
    expect(html).not.toContain("<canvas");
  });

  it("keeps release claims pending until a production scheduled run is verified", () => {
    expect(homeEditorial.status).toBe("pre-release");
    expect(homeEditorial.copy.zh.body).toContain("尚待生产验证");
    expect(homeEditorial.copy.en.body).toContain("await production verification");
    render(<HomeFeature locale="zh" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it.each(["zh", "en"])("keeps %s text and links readable when a verified screenshot fails", (locale) => {
    const feature: HomeEditorial = {
      ...homeEditorial,
      status: "production-verified",
      verification: { scheduledRunId: "fixture-run", verifiedAt: "2026-09-07", evidence: "test fixture only" },
      image: { src: "/images/test-only.png", width: 1200, height: 600, alt: { zh: "测试榜单截图", en: "Test leaderboard screenshot" } },
    };
    render(<HomeFeature locale={locale} feature={feature} />);
    expect(screen.getByRole("img").getAttribute("alt")).toBe(feature.image.alt[locale as "zh" | "en"]);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("heading").textContent).toBe(feature.copy[locale as "zh" | "en"].title);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
