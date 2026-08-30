// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BlogPostPage, { generateStaticParams } from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
  setRequestLocale: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Navbar", () => ({
  Navbar: () => <nav>navbar</nav>,
}));

vi.mock("@/components/ScrollProgress", () => ({
  ScrollProgress: () => null,
}));

vi.mock("@/components/TableOfContents", () => ({
  TableOfContents: () => <aside>toc</aside>,
}));

vi.mock("@/components/SiteFooter", () => ({
  SiteFooter: () => <footer>site-footer</footer>,
}));

vi.mock("@/components/BlogCard", () => ({
  BlogCard: ({ post }: { post: { title: string } }) => <article>{post.title}</article>,
}));

vi.mock("@/components/BlogProseGuard", () => ({
  BlogProseGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/MDXContent", () => ({
  compileMDXWithHeadings: async () => ({
    content: <p>article-body</p>,
    headings: [],
  }),
}));

afterEach(() => {
  cleanup();
});

const SLUG = "frontend-performance-optimization";

async function renderPost(locale: "zh" | "en") {
  const ui = await BlogPostPage({
    params: Promise.resolve({ locale, slug: SLUG }),
  });
  return render(ui);
}

describe("BlogPostPage", () => {
  it.each(["zh", "en"] as const)("%s 文章页不再渲染留言板", async (locale) => {
    const { container } = await renderPost(locale);

    expect(screen.getByText("article-body")).toBeTruthy();
    expect(screen.getByText("site-footer")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "留言" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Comments" })).toBeNull();
    expect(container.querySelector("script[src*='giscus']")).toBeNull();
    expect(container.querySelector("iframe[src*='giscus']")).toBeNull();
    expect(container.innerHTML.toLowerCase()).not.toContain("giscus");
  });

  it("静态参数仍覆盖中英文同一篇文章", () => {
    const params = generateStaticParams();
    expect(params).toEqual(
      expect.arrayContaining([
        { locale: "zh", slug: SLUG },
        { locale: "en", slug: SLUG },
      ]),
    );
  });
});
