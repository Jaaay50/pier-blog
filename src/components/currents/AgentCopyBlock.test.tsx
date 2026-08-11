// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCopyBlock, AgentCopyChip } from "./AgentCopyBlock";

const labels = {
  copyLabel: "复制",
  copiedLabel: "已复制",
  copyFailedLabel: "复制失败",
};

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(writeText) },
  });
}

beforeEach(() => {
  setClipboard(async () => {});
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn(() => false),
  });
});

afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
  vi.useRealTimers();
});

describe("AgentCopyBlock", () => {
  it("复制成功后更新可访问名称和 live status，并以最后一次点击重新计时", async () => {
    vi.useFakeTimers();
    render(<AgentCopyChip text="今天有什么热点？" {...labels} />);

    const button = screen.getByRole("button", { name: "复制: 今天有什么热点？" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(button.getAttribute("aria-label")).toBe("已复制: 今天有什么热点？");
    expect(screen.getByRole("status").textContent).toBe("已复制");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      fireEvent.click(button);
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(button.getAttribute("aria-label")).toBe("已复制: 今天有什么热点？");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(button.getAttribute("aria-label")).toBe("复制: 今天有什么热点？");
  });

  it("Clipboard API 与旧式复制都失败时选中原文并暴露失败状态", async () => {
    setClipboard(async () => {
      throw new Error("denied");
    });

    render(
      <AgentCopyBlock text="TOKEN=example" label="config" {...labels}>
        <pre>
          <code>TOKEN=example</code>
        </pre>
      </AgentCopyBlock>,
    );

    const button = screen.getByRole("button", { name: "复制" });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(button.getAttribute("aria-label")).toBe("复制失败");
    expect(screen.getByRole("status").textContent).toBe("复制失败");
    expect(window.getSelection()?.toString()).toBe("TOKEN=example");
  });

  it("忽略晚于新请求完成的旧复制结果", async () => {
    vi.useFakeTimers();
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((resolve) => { resolveFirst = resolve; });
    const second = new Promise<void>((resolve) => { resolveSecond = resolve; });
    const writeText = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    setClipboard(writeText);
    render(<AgentCopyChip text="并发复制" {...labels} />);

    const button = screen.getByRole("button", { name: "复制: 并发复制" });
    fireEvent.click(button);
    fireEvent.click(button);

    await act(async () => {
      resolveSecond();
      await second;
    });
    expect(button.getAttribute("aria-label")).toBe("已复制: 并发复制");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      resolveFirst();
      await first;
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(button.getAttribute("aria-label")).toBe("复制: 并发复制");
  });
});
