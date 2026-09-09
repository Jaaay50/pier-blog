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
    expect(screen.getByTestId("guestbook-list").className).toContain("sr-only");
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
