// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentsApiError, submitSiteFeedback } from "@/lib/currents/api";
import { SiteFeedbackForm, type SiteFeedbackLabels } from "./SiteFeedbackForm";

vi.mock("@/lib/currents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/currents/api")>();
  return { ...actual, submitSiteFeedback: vi.fn() };
});

const turnstileResetMock = vi.fn();
vi.mock("@/components/TurnstileWidget", () => ({
  TurnstileWidget: forwardRef(function MockTurnstile(
    {
      onToken,
      onExpired,
      onError,
    }: {
      onToken: (token: string) => void;
      onExpired: () => void;
      onError: () => void;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({ reset: turnstileResetMock }));
    return (
      <div>
        <button type="button" onClick={() => onToken("site-turnstile-token")}>Verify</button>
        <button type="button" onClick={onExpired}>Expire</button>
        <button type="button" onClick={onError}>Turnstile error</button>
      </div>
    );
  }),
}));

const submitMock = vi.mocked(submitSiteFeedback);

class TestStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const labels: SiteFeedbackLabels = {
  categoryLabel: "反馈类型",
  categories: {
    product_bug: "产品问题",
    feature_request: "功能建议",
    source_suggestion: "信源建议",
    agent_access: "Agent 接入",
    other: "其他",
  },
  messageLabel: "详细描述",
  messagePlaceholder: "发生了什么？",
  messageRequired: "请至少填写 4 个字符的描述。",
  submit: "提交反馈",
  submitting: "提交中…",
  success: "已收到，感谢反馈。",
  successDuplicate: "已收到并去重。",
  alreadyReported: "该类型的反馈刚才已提交过。",
  errorRateLimit: "提交过于频繁，请稍后再试。",
  errorNetwork: "网络异常，请检查连接后重试。",
  errorVerification: "人机验证未通过，请重新验证后再试。",
  errorVerificationUnavailable: "人机验证暂时不可用，请稍后再试。",
  errorGeneric: "提交失败，请稍后再试。",
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: new TestStorage(),
  });
  window.history.replaceState({}, "", "/zh/feedback");
  submitMock.mockReset();
  turnstileResetMock.mockReset();
});

afterEach(() => cleanup());

describe("SiteFeedbackForm", () => {
  it("验证完成前禁用提交；成功时携带 token、清空正文并重置 widget", async () => {
    submitMock.mockResolvedValue({ ok: true });
    render(<SiteFeedbackForm locale="zh" labels={labels} />);
    const submit = screen.getByRole("button", { name: "提交反馈" }) as HTMLButtonElement;
    const message = screen.getByLabelText("详细描述") as HTMLTextAreaElement;
    fireEvent.change(message, { target: { value: "  页面提交失败  " } });
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    expect(submitMock).toHaveBeenCalledWith({
      category: "product_bug",
      message: "页面提交失败",
      locale: "zh",
      pagePath: "/zh/feedback",
      turnstileToken: "site-turnstile-token",
    });
    expect(turnstileResetMock).toHaveBeenCalledOnce();
    expect((await screen.findByRole("status")).textContent).toContain("已收到，感谢反馈。");
  });

  it.each([
    [400, "human_verification_failed", "人机验证未通过，请重新验证后再试。"],
    [503, "verification_unavailable", "人机验证暂时不可用，请稍后再试。"],
  ])("后端验证错误 %i 重置 token，但保留正文", async (status, code, expected) => {
    submitMock.mockRejectedValue(new CurrentsApiError(`http-${status}`, status, code));
    render(<SiteFeedbackForm locale="zh" labels={labels} />);
    const message = screen.getByLabelText("详细描述") as HTMLTextAreaElement;
    fireEvent.change(message, { target: { value: "请保留这段反馈" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.click(screen.getByRole("button", { name: "提交反馈" }));

    expect((await screen.findByRole("alert")).textContent).toContain(expected);
    expect(message.value).toBe("请保留这段反馈");
    expect(turnstileResetMock).toHaveBeenCalledOnce();
    expect((screen.getByRole("button", { name: "提交反馈" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("token 过期或 widget 错误时重置并阻止提交", () => {
    render(<SiteFeedbackForm locale="zh" labels={labels} />);
    fireEvent.change(screen.getByLabelText("详细描述"), { target: { value: "一段有效反馈" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    fireEvent.click(screen.getByRole("button", { name: "Expire" }));
    expect(turnstileResetMock).toHaveBeenCalledOnce();
    expect((screen.getByRole("button", { name: "提交反馈" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Turnstile error" }));
    expect(screen.getByRole("alert").textContent).toContain("人机验证暂时不可用");
    expect(turnstileResetMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "重新验证" }));
    expect(turnstileResetMock).toHaveBeenCalledTimes(2);
  });
});

it("keeps an in-flight site submission locked across widget error and renewed verification", async () => {
  let resolve!: (value: {ok:true}) => void;
  submitMock.mockImplementation(() => new Promise(done => { resolve = done; }));
  const {container} = render(<SiteFeedbackForm locale="zh" labels={labels}/>);
  fireEvent.change(screen.getByLabelText("详细描述"), {target:{value:"saved draft"}});
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
