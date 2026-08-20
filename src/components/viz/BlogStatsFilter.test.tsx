// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlogStatsFilter } from "./BlogStatsFilter";

// BlogCard 依赖 next-intl 路由上下文，筛选逻辑测试不需要其内部结构
vi.mock("@/components/BlogCard", () => ({
  BlogCard: ({ post }: { post: { slug: string; title: string } }) => (
    <article data-testid="blog-card">{post.title}</article>
  ),
}));

// jsdom 中 motion 退出动画不会完成，AnimatePresence 会保留退出中的节点；
// 这里只测筛选逻辑，把动画层 mock 成直通渲染
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const posts = [
  {
    slug: "a",
    title: "Post A",
    description: "about nextjs",
    date: "2026-08-01",
    tags: ["Next.js", "React"],
  },
  {
    slug: "b",
    title: "Post B",
    description: "about performance",
    date: "2026-08-02",
    tags: ["Performance"],
  },
  {
    slug: "c",
    title: "Post C",
    description: "more nextjs",
    date: "2026-08-03",
    tags: ["Next.js"],
  },
];

afterEach(() => {
  cleanup();
});

describe("BlogStatsFilter", () => {
  it("渲染全部标签及正确的文章数量", () => {
    render(<BlogStatsFilter posts={posts} />);

    const nextBtn = screen.getByRole("button", { name: /Next\.js/ });
    const reactBtn = screen.getByRole("button", { name: /React/ });
    const perfBtn = screen.getByRole("button", { name: /Performance/ });

    expect(nextBtn.textContent).toContain("2");
    expect(reactBtn.textContent).toContain("1");
    expect(perfBtn.textContent).toContain("1");

    // 默认显示全部文章
    expect(screen.getAllByTestId("blog-card")).toHaveLength(3);
  });

  it("点击标签后只显示对应文章", () => {
    render(<BlogStatsFilter posts={posts} />);

    fireEvent.click(screen.getByRole("button", { name: /Next\.js/ }));

    const cards = screen.getAllByTestId("blog-card");
    expect(cards).toHaveLength(2);
    expect(screen.queryByText("Post A")).not.toBeNull();
    expect(screen.queryByText("Post C")).not.toBeNull();
    expect(screen.queryByText("Post B")).toBeNull();
  });

  it("再次点击同一标签恢复全部文章", () => {
    render(<BlogStatsFilter posts={posts} />);

    const btn = screen.getByRole("button", { name: /Performance/ });
    fireEvent.click(btn);
    expect(screen.getAllByTestId("blog-card")).toHaveLength(1);

    fireEvent.click(btn);
    expect(screen.getAllByTestId("blog-card")).toHaveLength(3);
  });

  it("aria-pressed 状态正确切换", () => {
    render(<BlogStatsFilter posts={posts} />);

    const nextBtn = screen.getByRole("button", { name: /Next\.js/ });
    const perfBtn = screen.getByRole("button", { name: /Performance/ });

    expect(nextBtn.getAttribute("aria-pressed")).toBe("false");
    expect(perfBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(nextBtn);
    expect(nextBtn.getAttribute("aria-pressed")).toBe("true");
    expect(perfBtn.getAttribute("aria-pressed")).toBe("false");

    // 切换到另一标签：前者释放，后者选中
    fireEvent.click(perfBtn);
    expect(nextBtn.getAttribute("aria-pressed")).toBe("false");
    expect(perfBtn.getAttribute("aria-pressed")).toBe("true");

    // 再点当前标签：全部释放
    fireEvent.click(perfBtn);
    expect(perfBtn.getAttribute("aria-pressed")).toBe("false");
  });
});
