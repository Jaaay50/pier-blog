// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import SourceIndependence from "./SourceIndependence";
import StreamReading from "./StreamReading";
import WaitFeedback from "./WaitFeedback";
import AfterOff from "./AfterOff";

vi.mock("next-intl", () => ({ useLocale: () => "zh" }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("source disclosure", () => {
  it("expands the cited source, visibly selects it, toggles closed and clears both columns", () => {
    render(<SourceIndependence isDark={false} />);
    const outlet = screen.getByRole("button", { name: "媒体 A" });
    const detail = document.getElementById(outlet.getAttribute("aria-controls")!)!;
    expect(detail.hidden).toBe(true);
    expect(screen.getByRole("button", { name: "收起" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(outlet);
    expect(outlet.getAttribute("aria-expanded")).toBe("true");
    expect(outlet.className).toContain("bg-[var(--accent-soft)]");
    expect(detail.hidden).toBe(false);
    expect(detail.textContent).toContain("转述自 媒体 B");
    fireEvent.click(outlet);
    expect(detail.hidden).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "论文" }));
    expect(screen.getByRole("button", { name: "论文" }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "收起" }));
    expect(screen.getAllByRole("button").filter(button => button.getAttribute("aria-expanded") === "true")).toHaveLength(0);
  });
});

describe("SSR-safe motion preferences", () => {
  function reduce() {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
  }
  it("does not change initial stream markup when reduced motion is enabled before hydration", () => {
    const before = renderToString(<StreamReading isDark={false} />);
    reduce();
    expect(renderToString(<StreamReading isDark={false} />)).toBe(before);
    render(<StreamReading isDark={false} />);
    fireEvent.click(screen.getByRole("button", { name: "播放" }));
    expect(screen.getByText(/同一段回答可以逐字跳出/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "播放" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(screen.getByText("尚未开始。")).toBeTruthy();
  });
  it("keeps form state when both real decorative layers are disabled", () => {
    render(<AfterOff isDark={false} />);
    const input = screen.getByRole("textbox", { name: "给这艘船起个名字" });
    fireEvent.change(input, { target: { value: "Pier" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "动画" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "CSS 背景光" }));
    expect(document.querySelector(".lab-afteroff-backdrop")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    expect(screen.getByText("已记下：Pier")).toBeTruthy();
  });
  it("honors a preference change during an active wait and on the next replay", () => {
    const media = new EventTarget();
    Object.assign(media, { matches: false });
    vi.stubGlobal("matchMedia", () => media);
    render(<WaitFeedback isDark={false} />);
    fireEvent.click(screen.getAllByRole("button", { name: "等待三秒" })[0]);
    Object.assign(media, { matches: true });
    act(() => media.dispatchEvent(new Event("change")));
    expect(screen.getByText("完成")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "再等一次" }));
    expect(screen.getByText("完成")).toBeTruthy();
  });
  it("finishes each wait immediately with reduced motion and supports replay", () => {
    reduce();
    render(<WaitFeedback isDark={false} />);
    for (const button of screen.getAllByRole("button", { name: "等待三秒" })) fireEvent.click(button);
    expect(screen.getAllByText("完成")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "再等一次" })).toHaveLength(3);
  });
});
