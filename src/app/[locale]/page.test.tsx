// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { RecentArticles } from "@/components/home/RecentArticles";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));
vi.mock("@/components/Navbar", () => ({ Navbar: () => <nav /> }));
vi.mock("@/components/ImmersiveHero", () => ({
  ImmersiveHero: ({ subtitle, children }: { subtitle: string; children?: React.ReactNode }) => (
    <section data-section="hero"><p>{subtitle}</p>{children}</section>
  ),
}));
vi.mock("@/components/ProjectsBento", () => ({ ProjectsBento: () => <section data-section="projects" /> }));
vi.mock("@/components/LabTeaser", () => ({ LabTeaser: () => <section data-section="lab" /> }));
vi.mock("@/components/SiteFooter", () => ({ SiteFooter: () => <footer /> }));
vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/github", () => ({ getGitHubStats: async () => Array(4).fill({ stars: 0, forks: 0 }) }));
vi.mock("@/lib/posts", () => ({
  getAllPosts: () => Array.from({ length: 4 }, (_, index) => ({
    slug: `post-${index}`, title: `Article ${index}`, description: "Article body",
    date: `2026-08-${20 - index}`, updatedAt: "2026-09-07", tags: [], content: "", readMinutes: 1,
  })),
}));

afterEach(cleanup);

describe("HomePage editorial layout", () => {
  it.each(["zh", "en"])("keeps the %s hero subtitle without a Read Articles CTA", async (locale) => {
    const { container } = render(await HomePage({ params: Promise.resolve({ locale }) }));
    const hero = container.querySelector('[data-section="hero"]');
    expect(hero?.querySelector("p")?.textContent).toBe("heroSubtitle");
    expect(hero?.querySelector("a, button")).toBeNull();
  });

  it.each(["zh", "en"])("places the %s focus and three static articles before projects", async (locale) => {
    const { container } = render(await HomePage({ params: Promise.resolve({ locale }) }));
    const sections = [...container.querySelectorAll("main > section")].map((section) => section.getAttribute("data-section") ?? section.getAttribute("aria-labelledby"));
    expect(sections).toEqual(["hero", "home-feature-title", "home-articles-title", "projects", "lab"]);
    expect(container.querySelectorAll("article")).toHaveLength(3);
    expect(container.querySelectorAll('a[href="/currents/models"]')).toHaveLength(1);
    expect(container.querySelector('a[href="/currents"]')).toBeNull();
    const articleGrid = container.querySelector('[aria-labelledby="home-articles-title"] > div');
    expect(articleGrid?.className).toContain("grid");
    expect(articleGrid?.className).not.toContain("overflow-x");
    expect([...container.querySelectorAll("time")].map((time) => time.dateTime)).toEqual(["2026-08-20", "2026-08-19", "2026-08-18"]);
  });

  it("omits the article section when there are no published posts", () => {
    const { container } = render(<RecentArticles title="Recent" posts={[]} readMore="Read" locale="en" />);
    expect(container.innerHTML).toBe("");
  });
});
