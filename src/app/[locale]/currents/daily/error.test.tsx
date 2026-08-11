// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import CurrentsDailyError from "./error";

const messages = {
  currents: {
    errorLoad: "潮汐暂时不可用，请稍后再试。",
    retry: "重新加载",
  },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CurrentsDailyError", () => {
  it("只渲染父 Currents layout 内的错误内容，并提供可用的重试按钮", () => {
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { container } = render(
      <NextIntlClientProvider locale="zh" messages={messages}>
        <CurrentsDailyError error={new Error("upstream unavailable")} reset={reset} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("alert").textContent).toContain("潮汐暂时不可用，请稍后再试。");
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
