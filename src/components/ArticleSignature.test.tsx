// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleSignature } from "./ArticleSignature";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

afterEach(cleanup);

describe("ArticleSignature", () => {
  it("places a silent lamp and a single bottles link after the essay", () => {
    const { container } = render(<ArticleSignature leaveLabel="读完了，去漂瓶留一句" />);
    expect(container.querySelector(".article-signature-mark svg")).toBeTruthy();
    const link = screen.getByRole("link", { name: "读完了，去漂瓶留一句" });
    expect(link.getAttribute("href")).toBe("/guestbook");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });
});
