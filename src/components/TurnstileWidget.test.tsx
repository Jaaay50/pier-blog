// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTurnstileScriptForTests, TurnstileWidget, type TurnstileWidgetHandle } from "./TurnstileWidget";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

beforeEach(() => {
  vi.useRealTimers();
  resetTurnstileScriptForTests();
  delete window.turnstile;
  document.head.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((script) => script.remove());
});

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("TurnstileWidget", () => {
  it("a script that never completes times out; explicit retry reloads without losing the form", async () => {
    vi.useFakeTimers();
    const ref = createRef<TurnstileWidgetHandle>();
    const callbacks = { onToken: vi.fn(), onExpired: vi.fn(), onError: vi.fn() };
    render(<TurnstileWidget ref={ref} {...callbacks} />);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(callbacks.onError).toHaveBeenCalledOnce();
    expect(document.querySelector(`script[src="${SCRIPT_SRC}"]`)).toBeNull();
    act(() => ref.current?.reset());
    const script = document.querySelector(`script[src="${SCRIPT_SRC}"]`)!;
    expect(script).not.toBeNull();
    const renderWidget = vi.fn(() => "retry-widget");
    window.turnstile = { render: renderWidget, reset: vi.fn() };
    await act(async () => { script.dispatchEvent(new Event("load")); });
    expect(renderWidget).toHaveBeenCalledOnce();
  });
  it("只加载一次官方显式渲染脚本，并传递锁定的 widget 配置", async () => {
    const renderMock = vi.fn((...args: [HTMLElement, unknown]) => {
      void args;
      return "widget-1";
    });
    const callbacks = {
      onToken: vi.fn(),
      onExpired: vi.fn(),
      onError: vi.fn(),
    };
    const first = render(<TurnstileWidget {...callbacks} />);
    render(<TurnstileWidget {...callbacks} />);

    const scripts = document.head.querySelectorAll<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    expect(scripts).toHaveLength(1);
    window.turnstile = { render: renderMock, reset: vi.fn(), remove: vi.fn() };
    scripts[0].dispatchEvent(new Event("load"));

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
    const [, options] = renderMock.mock.calls[0] as [HTMLElement, Record<string, unknown>];
    expect(options).toMatchObject({
      action: "feedback_submit",
      appearance: "interaction-only",
      theme: "auto",
      language: "auto",
    });
    expect(typeof options.sitekey).toBe("string");
    expect(first.container.firstElementChild?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("脚本 load 后等待 window.turnstile 真正可用再渲染", async () => {
    vi.useFakeTimers();
    const renderMock = vi.fn(() => "widget-late");
    const callbacks = { onToken: vi.fn(), onExpired: vi.fn(), onError: vi.fn() };
    render(<TurnstileWidget {...callbacks} />);

    const script = document.head.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)!;
    script.dispatchEvent(new Event("load"));
    await vi.advanceTimersByTimeAsync(100);
    expect(renderMock).not.toHaveBeenCalled();

    window.turnstile = { render: renderMock, reset: vi.fn(), remove: vi.fn() };
    await vi.advanceTimersByTimeAsync(25);
    expect(renderMock).toHaveBeenCalledOnce();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("等待超时后报告错误并清空共享状态，后续挂载可重新加载", async () => {
    vi.useFakeTimers();
    const firstCallbacks = { onToken: vi.fn(), onExpired: vi.fn(), onError: vi.fn() };
    const first = render(<TurnstileWidget {...firstCallbacks} />);
    const firstScript = document.head.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)!;
    firstScript.dispatchEvent(new Event("load"));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(firstCallbacks.onError).toHaveBeenCalledOnce();
    expect(document.head.querySelector(`script[src="${SCRIPT_SRC}"]`)).toBeNull();

    first.unmount();
    const secondCallbacks = { onToken: vi.fn(), onExpired: vi.fn(), onError: vi.fn() };
    render(<TurnstileWidget {...secondCallbacks} />);
    const secondScript = document.head.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)!;
    expect(secondScript).not.toBe(firstScript);
    const renderMock = vi.fn(() => "widget-retry");
    window.turnstile = { render: renderMock, reset: vi.fn(), remove: vi.fn() };
    secondScript.dispatchEvent(new Event("load"));
    await vi.runAllTimersAsync();
    expect(renderMock).toHaveBeenCalledOnce();
    expect(secondCallbacks.onError).not.toHaveBeenCalled();
  });
});
