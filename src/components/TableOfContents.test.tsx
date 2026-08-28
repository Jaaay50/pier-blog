// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TableOfContents } from "./TableOfContents";

vi.mock("motion/react", () => ({
  motion: {
    span: ({ children, ...props }: React.ComponentProps<"span"> & Record<string, unknown>) => {
      const safeProps = { ...props };
      delete safeProps.layoutId;
      delete safeProps.transition;
      return <span {...safeProps}>{children}</span>;
    },
    div: ({ children, ...props }: React.ComponentProps<"div"> & Record<string, unknown>) => {
      const safeProps = { ...props };
      delete safeProps.initial;
      delete safeProps.animate;
      delete safeProps.exit;
      delete safeProps.transition;
      return <div {...safeProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock("@/lib/animations/lenis", () => ({
  getLenis: () => null,
}));

const headings: Array<{ id: string; text: string; level: 2 | 3 }> = [
  { id: "first", text: "第一节", level: 2 },
  { id: "second", text: "第二节", level: 2 },
];

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  document.body.innerHTML = '<button id="outside">外部按钮</button>';
  document.body.style.overflow = "";
  document.getElementById("first")?.remove();
  document.getElementById("second")?.remove();
  for (const heading of headings) {
    const element = document.createElement("h2");
    element.id = heading.id;
    document.body.append(element);
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TableOfContents", () => {
  it("打开抽屉后聚焦关闭按钮，Tab 循环并在关闭后还原触发按钮焦点", () => {
    render(<TableOfContents headings={headings} />);
    const trigger = screen.getByRole("button", { name: "Toggle table of contents" });
    trigger.focus();

    fireEvent.click(trigger);
    const close = screen.getByRole("button", { name: "Close table of contents" });
    const items = screen.getAllByRole("button").filter((button) => button !== trigger && button !== close);
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items.at(-1));

    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("使用本地化目录名称，关闭的移动抽屉不进入可访问树", () => {
    render(
      <TableOfContents
        headings={headings}
        labels={{
          toc: "本文目录",
          open: "打开本文目录",
          close: "关闭本文目录",
        }}
      />,
    );

    const drawer = document.querySelector(".toc-drawer");
    expect(screen.getByRole("button", { name: "打开本文目录" })).toBeTruthy();
    expect(drawer?.getAttribute("aria-hidden")).toBe("true");
    expect(drawer?.hasAttribute("inert")).toBe(true);
    expect(screen.queryByRole("button", { name: "关闭本文目录" })).toBeNull();
    expect(document.getElementById("article-toc-heading-desktop")?.textContent).toBe("本文目录");
    expect(document.getElementById("article-toc-heading-mobile")?.textContent).toBe("本文目录");

    fireEvent.click(screen.getByRole("button", { name: "打开本文目录" }));
    expect(drawer?.getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByRole("button", { name: "关闭本文目录" })).toBeTruthy();
  });
});
