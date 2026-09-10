// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import { CurrentsApiError } from "@/lib/currents/api";
import { submitGuestbookEntry } from "@/lib/guestbook";
import { GuestbookBoard } from "./GuestbookBoard";

vi.mock("@/lib/guestbook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/guestbook")>();
  return { ...actual, submitGuestbookEntry: vi.fn() };
});

const turnstileResetMock = vi.fn();
vi.mock("@/components/TurnstileWidget", () => ({
  TurnstileWidget: forwardRef(function MockTurnstile(
    {
      onToken,
      action,
    }: {
      onToken: (token: string) => void;
      action?: string;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ reset: turnstileResetMock }));
    return (
      <button type="button" data-action={action} onClick={() => onToken("guestbook-token")}>
        Verify
      </button>
    );
  }),
}));

const submitMock = vi.mocked(submitGuestbookEntry);

const sample = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  nickname: "Visitor_ab12",
  message: "潮水把这句话送上岸",
  createdAt: "2026-09-09T12:00:00.000Z",
};

function renderBoard() {
  return render(
    <NextIntlClientProvider locale="zh" messages={zh}>
      <GuestbookBoard locale="zh" initialEntries={[sample]} />
    </NextIntlClientProvider>,
  );
}

/** 默认 beforeEach 走的是 reduced-motion（无画布）；这个切到潮水模式 */
function enterTideMode() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
}

beforeEach(() => {
  submitMock.mockReset();
  turnstileResetMock.mockReset();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GuestbookBoard", () => {
  it("英雄区标题与副标题由本组件渲染，各只出现一次", () => {
    renderBoard();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(zh.guestbook.title);
    expect(screen.getAllByText(zh.guestbook.subtitle)).toHaveLength(1);
    expect(screen.getByText(zh.guestbook.label)).toBeTruthy();
  });

  it("reduced-motion：不挂画布，列表可见且不是 sr-only", () => {
    renderBoard();
    expect(screen.queryByTestId("guestbook-tide")).toBeNull();
    const list = screen.getByTestId("guestbook-list");
    expect(list.className).not.toContain("sr-only");
    expect(screen.getByTestId(`guestbook-entry-${sample.id}`)).toBeTruthy();
  });

  it("拾取一条会高亮已有留言", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("guestbook-pick"));
    expect(screen.getByTestId(`guestbook-entry-${sample.id}`).className).toContain("border-[var(--accent)]");
  });

  it("提交成功后把新瓶子插到列表顶部", async () => {
    submitMock.mockResolvedValue({
      ok: true,
      entry: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        nickname: "Visitor_cd34",
        message: "新漂来的瓶子",
        createdAt: "2026-09-09T13:00:00.000Z",
      },
    });
    renderBoard();
    fireEvent.click(screen.getByText("Verify"));
    fireEvent.change(screen.getByTestId("guestbook-message"), { target: { value: "新漂来的瓶子" } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("guestbook-form"));
    });
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    expect(submitMock.mock.calls[0]?.[0]).toMatchObject({
      message: "新漂来的瓶子",
      locale: "zh",
      turnstileToken: "guestbook-token",
    });
    expect(screen.getByText("新漂来的瓶子")).toBeTruthy();
    expect(screen.getByText("已送到岸边。")).toBeTruthy();
  });

  it("潮水模式下拾取会打开岸边来信", () => {
    enterTideMode();
    renderBoard();
    fireEvent.click(screen.getByTestId("guestbook-pick"));
    expect(screen.getByTestId("guestbook-tide")).toBeTruthy();
    expect(screen.getByTestId("guestbook-read-card").textContent).toContain(sample.message);
    expect(screen.getByTestId("guestbook-list").className).toContain("sr-only");
  });

  it("潮水模式：方向键只移动高亮，Enter 才打开读卡，Esc 关掉后焦点回画布", () => {
    enterTideMode();
    const rect = {
      width: 800,
      height: 480,
      top: 0,
      left: 0,
      right: 800,
      bottom: 480,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
    renderBoard();

    const canvas = screen.getByTestId("guestbook-canvas");
    expect(canvas.getAttribute("tabindex")).toBe("0");

    // 方向键：进入画布后先落到入口瓶，但不该弹出读卡
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(screen.queryByTestId("guestbook-read-card")).toBeNull();
    // 高亮的那条要能被读屏播报
    expect(screen.getByRole("status").textContent).toContain(sample.message);

    fireEvent.keyDown(canvas, { key: "Enter" });
    const card = screen.getByTestId("guestbook-read-card");
    expect(card.textContent).toContain(sample.message);
    expect(document.activeElement).toBe(card);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("guestbook-read-card")).toBeNull();
    expect(document.activeElement).toBe(canvas);

    rectSpy.mockRestore();
  });

  it("429 显示限流提示", async () => {
    submitMock.mockRejectedValue(new CurrentsApiError("http-429", 429, "rate_limited", 120));
    renderBoard();
    fireEvent.click(screen.getByText("Verify"));
    fireEvent.change(screen.getByTestId("guestbook-message"), { target: { value: "再写一条" } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("guestbook-form"));
    });
    expect(await screen.findByTestId("guestbook-rate-limit")).toBeTruthy();
  });
});
