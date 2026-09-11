// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
      onError,
      action,
    }: {
      onToken: (token: string) => void;
      onError: () => void;
      action?: string;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ reset: turnstileResetMock }));
    return (
      <>
        <button type="button" data-action={action} onClick={() => onToken("guestbook-token")}>
          Verify
        </button>
        <button type="button" onClick={onError}>Fail verification</button>
      </>
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

function renderBoard(initialEntries = [sample]) {
  return render(
    <NextIntlClientProvider locale="zh" messages={zh}>
      <GuestbookBoard locale="zh" initialEntries={initialEntries} />
    </NextIntlClientProvider>,
  );
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("GuestbookBoard", () => {
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
    renderBoard();
    fireEvent.click(screen.getByTestId("guestbook-pick"));
    expect(screen.getByTestId("guestbook-tide")).toBeTruthy();
    expect(screen.getByTestId("guestbook-read-card").textContent).toContain(sample.message);
    const list = screen.getByTestId("guestbook-list");
    expect(list.className).toContain("guestbook-coastal-list");
    expect(list.className).toContain("space-y-4");
    expect(list.className).not.toContain("sr-only");
    const form = screen.getByTestId("guestbook-form");
    expect(form.className).not.toContain("-mt-28");
    expect(form.className).not.toContain("z-20");
  });

  it("拾取从完整列表抽样，不限于最近三只", () => {
    const older = {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      nickname: "Visitor_ef56",
      message: "更早的瓶子",
      createdAt: "2026-09-08T12:00:00.000Z",
    };
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    renderBoard([
      sample,
      { ...sample, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", message: "第二" },
      { ...sample, id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", message: "第三" },
      older,
    ]);
    fireEvent.click(screen.getByTestId("guestbook-pick"));
    expect(screen.getByTestId(`guestbook-entry-${older.id}`).className).toContain("border-[var(--accent)]");
    random.mockRestore();
  });

  it("潮水空态只在水面上提示一次", () => {
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
    renderBoard([]);
    expect(screen.getByTestId("guestbook-tide")).toBeTruthy();
    expect(screen.getByText(zh.guestbook.empty)).toBeTruthy();
    expect(screen.queryByTestId("guestbook-empty")).toBeNull();
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

  it("验证脚本失败后可重试，保留草稿并在拿到新 token 后提交", async () => {
    submitMock.mockResolvedValue({ ok: true, entry: sample });
    renderBoard();
    const textarea = screen.getByTestId("guestbook-message") as HTMLTextAreaElement;
    const submit = screen.getByTestId("guestbook-submit") as HTMLButtonElement;
    fireEvent.change(textarea, { target: { value: sample.message } });
    fireEvent.click(screen.getByText("Fail verification"));
    expect(screen.getByRole("alert").textContent).toBe(zh.guestbook.errorVerificationUnavailable);
    expect(submit.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: zh.guestbook.retry }));
    expect(turnstileResetMock).toHaveBeenCalledOnce();
    expect(textarea.value).toBe(sample.message);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(submit.disabled).toBe(true);
    expect(submitMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Verify"));
    expect(submit.disabled).toBe(false);
    await act(async () => fireEvent.submit(screen.getByTestId("guestbook-form")));
    expect(submitMock).toHaveBeenCalledWith(expect.objectContaining({
      message: sample.message,
      turnstileToken: "guestbook-token",
    }));
    expect(textarea.value).toBe("");
  });

  it("429 冷却不被验证失败、重试或新 token 提前解除，草稿一直保留", async () => {
    vi.useFakeTimers();
    submitMock.mockRejectedValue(new CurrentsApiError("http-429", 429, "rate_limited", 3));
    renderBoard();
    const textarea = screen.getByTestId("guestbook-message") as HTMLTextAreaElement;
    const submit = screen.getByTestId("guestbook-submit") as HTMLButtonElement;
    fireEvent.change(textarea, { target: { value: sample.message } });
    fireEvent.click(screen.getByText("Verify"));
    await act(async () => fireEvent.submit(screen.getByTestId("guestbook-form")));
    expect(submitMock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText("Fail verification"));
    expect(screen.getByTestId("guestbook-rate-limit")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: zh.guestbook.retry }));
    fireEvent.click(screen.getByText("Verify"));
    expect(submit.disabled).toBe(true);
    expect(textarea.disabled).toBe(true);
    expect(textarea.value).toBe(sample.message);
    expect(screen.getByTestId("guestbook-rate-limit")).toBeTruthy();
    await act(async () => fireEvent.submit(screen.getByTestId("guestbook-form")));
    expect(submitMock).toHaveBeenCalledOnce();

    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(submit.disabled).toBe(true);
    expect(textarea.disabled).toBe(true);
    expect(textarea.value).toBe(sample.message);
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(submit.disabled).toBe(false);
    expect(textarea.disabled).toBe(false);
    expect(textarea.value).toBe(sample.message);
    expect(screen.queryByTestId("guestbook-rate-limit")).toBeNull();
    expect(submitMock).toHaveBeenCalledOnce();
  });

  it("冷却结束不清掉仍待恢复的验证错误", async () => {
    vi.useFakeTimers();
    submitMock.mockRejectedValue(new CurrentsApiError("http-429", 429, "rate_limited", 1));
    renderBoard();
    fireEvent.change(screen.getByTestId("guestbook-message"), { target: { value: sample.message } });
    fireEvent.click(screen.getByText("Verify"));
    await act(async () => fireEvent.submit(screen.getByTestId("guestbook-form")));
    fireEvent.click(screen.getByText("Fail verification"));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.queryByTestId("guestbook-rate-limit")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(zh.guestbook.errorVerificationUnavailable);
    expect(screen.getByRole("button", { name: zh.guestbook.retry })).toBeTruthy();
    expect((screen.getByTestId("guestbook-submit") as HTMLButtonElement).disabled).toBe(true);
  });

  it.each(["字\n".repeat(250), "x".repeat(500)])("长留言在静态列表中允许任意位置换行", (message) => {
    renderBoard([{ ...sample, message }]);
    const entry = screen.getByTestId(`guestbook-entry-${sample.id}`);
    const body = entry.querySelector("p:last-child")!;
    expect(body.textContent).toBe(message);
    expect(body.className).toContain("[overflow-wrap:anywhere]");
    expect(body.className).toContain("whitespace-pre-wrap");
  });

  it.each(["字\n".repeat(250), "x".repeat(500)])("长读卡限制高度、正文独立滚动且关闭控件不被挤走", (message) => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    renderBoard([{ ...sample, message }]);
    const pick = screen.getByTestId("guestbook-pick");
    fireEvent.click(pick);
    const card = screen.getByTestId("guestbook-read-card");
    expect(card.className).toContain("max-h-[min(calc(100%_-_2.5rem),calc(100dvh_-_2rem))]");
    expect(card.className).toContain("flex-col");
    expect(card.className).toContain("overflow-hidden");
    expect(document.activeElement).toBe(card);
    const body = card.querySelector<HTMLParagraphElement>("p[tabindex]")!;
    expect(body.textContent).toBe(message);
    expect(body.className).toContain("min-h-0");
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("[overflow-wrap:anywhere]");
    expect(body.tabIndex).toBe(0);
    const close = within(card).getByRole("button", { name: zh.guestbook.closeCard });
    expect(close.className).toContain("shrink-0");
    expect(body.contains(close)).toBe(false);
    fireEvent.click(close);
    expect(screen.queryByTestId("guestbook-read-card")).toBeNull();
    expect(document.activeElement).toBe(pick);
  });
});
