// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import WaitFeedback from "./WaitFeedback";
import zh from "@/messages/zh.json";

afterEach(cleanup);

describe("WaitFeedback", () => {
  it("labels itself as an experiment and keeps every wait keyboard reachable", () => {
    render(
      <NextIntlClientProvider locale="zh" messages={zh}>
        <WaitFeedback isDark onReadyChange={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/不是真实操作/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "等待三秒" })).toHaveLength(3);
  });

  it("does not claim the unreliable bar is true progress", () => {
    render(
      <NextIntlClientProvider locale="zh" messages={zh}>
        <WaitFeedback isDark onReadyChange={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("不可靠进度")).toBeTruthy();
    expect(screen.getByText(/不能拿它当事实/)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "不可靠进度" })).toBeTruthy();
  });
});
