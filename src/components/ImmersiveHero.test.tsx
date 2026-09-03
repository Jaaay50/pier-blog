// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImmersiveHero } from "./ImmersiveHero";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}));

vi.mock("@/lib/webgl", () => ({
  useWebGLQuality: () => null,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/components/reactbits/ShinyText", () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ComponentProps<"div">>) => <div {...props}>{children}</div>,
    svg: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ComponentProps<"svg">>) => <svg {...props}>{children}</svg>,
    span: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ComponentProps<"span">>) => <span {...props}>{children}</span>,
  },
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useTransform: () => 0,
}));

afterEach(() => {
  cleanup();
});

describe("ImmersiveHero", () => {
  it("keeps the Chinese pun in aria-label once and hides the glyph copy", () => {
    const title = "全栈的栈，也是栈桥的栈";
    render(<ImmersiveHero title={title} subtitle="副标题" />);
    const h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.getAttribute("aria-label")).toBe(title);
    expect(h1?.querySelector(".sr-only")).toBeNull();
    expect(h1?.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(h1?.outerHTML.match(/全栈的栈/g)).toEqual([title.slice(0, 4)]);
    expect(h1?.textContent?.includes(`${title}${title}`)).toBe(false);
  });

  it("keeps the English title in aria-label once", () => {
    const title = "A pier has to hold at both ends";
    render(<ImmersiveHero title={title} subtitle="sub" />);
    const h1 = document.querySelector("h1");
    expect(h1?.getAttribute("aria-label")).toBe(title);
    expect(h1?.outerHTML.match(/A pier has to hold/g)).toHaveLength(1);
  });

  it("defaults to the Chinese pun when no title prop is passed", () => {
    render(<ImmersiveHero subtitle="副标题" />);
    const h1 = document.querySelector("h1");
    expect(h1?.getAttribute("aria-label")).toBe("全栈的栈，也是栈桥的栈");
  });
});
