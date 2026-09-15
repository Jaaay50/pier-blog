// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LabTerminal } from "./LabTerminal";
import { LAB_DEMO_IDS } from "./lab-demos";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";

vi.mock("@/components/TransitionLink", () => ({
  TransitionLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

afterEach(cleanup);

describe("LabTerminal", () => {
  it("stays closed until the konami sequence, then closes on Escape", () => {
    render(
      <NextIntlClientProvider locale="zh" messages={zh}>
        <LabTerminal />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    const sequence = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "b", "a",
    ];
    for (const key of sequence) fireEvent.keyDown(window, { key });
    expect(screen.getByRole("dialog", { name: "船坞终端" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lists the current English demo ids from LAB_DEMO_IDS", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LabTerminal />
      </NextIntlClientProvider>,
    );
    const sequence = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "b", "a",
    ];
    for (const key of sequence) fireEvent.keyDown(window, { key });
    const input = screen.getByRole("textbox", { name: "Terminal input" });
    fireEvent.change(input, { target: { value: "ls" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText(LAB_DEMO_IDS.join(" "))).toBeTruthy();
  });
});
