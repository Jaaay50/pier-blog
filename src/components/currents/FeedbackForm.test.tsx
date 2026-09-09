// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackForm, type FeedbackLabels } from "./FeedbackForm";
import { CurrentsApiError, submitFeedback } from "@/lib/currents/api";
import { FEEDBACK_STORAGE_KEY } from "@/lib/currents/feedback-state";

vi.mock("@/lib/currents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/currents/api")>();
  return { ...actual, submitFeedback: vi.fn() };
});

const turnstileResetMock = vi.fn();
vi.mock("@/components/TurnstileWidget", () => ({
  TurnstileWidget: forwardRef(function MockTurnstile(
    { onToken, onError, onExpired }: { onToken: (token: string) => void; onError: () => void; onExpired: () => void },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ reset: turnstileResetMock }));
    return <div><button type="button" onClick={() => onToken("test-turnstile-token")}>Verify</button><button type="button" onClick={onError}>Turnstile error</button><button type="button" onClick={onExpired}>Expire</button></div>;
  }),
}));

const submitMock = vi.mocked(submitFeedback);

class TestStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const labels: FeedbackLabels = {
  trigger: "反馈问题",
  title: "反馈问题",
  categoryLabel: "问题类型",
  categories: {
    content_error: "内容错误",
    translation_issue: "翻译问题",
    broken_link: "失效链接",
    category_or_score: "分类或评分不当",
    other: "其他",
  },
  messageLabel: "补充说明（选填）",
  messagePlaceholder: "可简单描述问题所在…",
  submit: "提交",
  submitting: "提交中…",
  success: "已收到，感谢反馈。",
  alreadyReported: "此类型已反馈过",
  errorRateLimit: "提交过于频繁，请稍后再试。",
  errorNetwork: "网络异常，请重试。",
  errorVerification: "人机验证未通过，请重新验证后再试。",
  errorVerificationUnavailable: "人机验证暂时不可用，请稍后再试。",
  errorGeneric: "提交失败，请稍后再试。",
  close: "收起",
};

function renderForm(targetType: "item" | "event" = "item", targetId = "item-1") {
  return render(<FeedbackForm targetType={targetType} targetId={targetId} locale="zh" labels={labels} />);
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new TestStorage(),
  });
  submitMock.mockReset();
  turnstileResetMock.mockReset();
});

afterEach(() => cleanup());

describe("FeedbackForm", () => {
  it("默认低调折叠；打开后具备完整 labels、可见焦点样式与 1000 字上限", () => {
    renderForm();
    const trigger = screen.getByRole("button", { name: "反馈问题" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.className).toContain("focus-visible:outline");

    fireEvent.click(trigger);
    expect(screen.getByRole("heading", { name: "反馈问题" })).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    expect(radios[0].parentElement?.className).toContain("focus-within:outline");

    const message = screen.getByLabelText("补充说明（选填）") as HTMLTextAreaElement;
    expect(message.maxLength).toBe(1000);
    expect(message.className).toContain("focus-visible:outline");
    const submit = screen.getByRole("button", { name: "提交" }) as HTMLButtonElement;
    expect(submit.className).toContain("text-[var(--accent-contrast)]");
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(submit.disabled).toBe(false);
  });

  it("成功提交正确 payload，写 localStorage；同类别禁用但其他类别仍可提交", async () => {
    submitMock.mockResolvedValue({ ok: true });
    renderForm("event", "event-1");
    fireEvent.click(screen.getByRole("button", { name: "反馈问题" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.click(screen.getByRole("radio", { name: "失效链接" }));
    fireEvent.change(screen.getByLabelText("补充说明（选填）"), { target: { value: "  链接 404  " } });
    fireEvent.change(document.querySelector('input[name="website"]')!, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    expect(submitMock).toHaveBeenCalledWith({
      targetType: "event",
      targetId: "event-1",
      category: "broken_link",
      message: "链接 404",
      locale: "zh",
      turnstileToken: "test-turnstile-token",
    });
    expect((await screen.findByRole("status")).textContent).toContain("已收到，感谢反馈。");
    expect(JSON.parse(window.localStorage.getItem(FEEDBACK_STORAGE_KEY)!)).toEqual([
      "event:event-1:broken_link",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "收起" }));
    fireEvent.click(screen.getByRole("button", { name: "反馈问题" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("此类型已反馈过");
    fireEvent.click(screen.getByRole("radio", { name: "其他" }));
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("honeypot 非空时随 payload 提交，由后端静默处理", async () => {
    submitMock.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "反馈问题" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.change(document.querySelector('input[name="website"]')!, { target: { value: "https://bot.example" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    expect(submitMock.mock.calls[0][0]).toMatchObject({ website: "https://bot.example" });
  });

  it.each([
    [new CurrentsApiError("http-429", 429), "提交过于频繁，请稍后再试。"],
    [new CurrentsApiError("network-error", null), "网络异常，请重试。"],
    [new CurrentsApiError("http-500", 500), "提交失败，请稍后再试。"],
  ])("按错误类型显示可重试状态 %#", async (error, expected) => {
    submitMock.mockRejectedValue(error);
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "反馈问题" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect((await screen.findByRole("alert")).textContent).toContain(expected);
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([
    [400, "human_verification_failed", "人机验证未通过，请重新验证后再试。"],
    [503, "verification_unavailable", "人机验证暂时不可用，请稍后再试。"],
  ])("验证错误 %i 保留正文并重置 widget", async (status, code, expected) => {
    submitMock.mockRejectedValue(new CurrentsApiError(`http-${status}`, status, code));
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "反馈问题" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    const message = screen.getByLabelText("补充说明（选填）") as HTMLTextAreaElement;
    fireEvent.change(message, { target: { value: "请保留这段正文" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect((await screen.findByRole("alert")).textContent).toContain(expected);
    expect(message.value).toBe("请保留这段正文");
    expect(turnstileResetMock).toHaveBeenCalledOnce();
    expect((screen.getByRole("button", { name: "提交" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

it.each(["item", "event"] as const)("%s keeps the submission locked when verification fails in flight", async (target) => {
  let resolve!: (value: {ok:true}) => void;
  submitMock.mockImplementation(() => new Promise(done => { resolve = done; }));
  const {container} = renderForm(target);
  fireEvent.click(screen.getByRole("button", {name:"反馈问题"}));
  fireEvent.change(screen.getByLabelText("补充说明（选填）"), {target:{value:"saved draft"}});
  fireEvent.click(screen.getByRole("button", {name:"Verify"}));
  fireEvent.submit(container.querySelector("form")!);
  fireEvent.click(screen.getByRole("button", {name:"Turnstile error"}));
  fireEvent.click(screen.getByRole("button", {name:"Verify"}));
  fireEvent.submit(container.querySelector("form")!);
  expect(submitMock).toHaveBeenCalledOnce();
  expect((screen.getByRole("button", {name:"提交中…"}) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolve({ok:true}));
  expect(screen.getByRole("status").textContent).toBe(labels.success);
});
