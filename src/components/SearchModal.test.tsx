// @vitest-environment jsdom

import type { ComponentProps, PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import { SearchModal } from "./SearchModal";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), push: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: PropsWithChildren) => children,
  motion: {
    div: ({ children, ...props }: ComponentProps<"div"> & Record<string, unknown>) => {
      const domProps = Object.fromEntries(Object.entries(props).filter(([key]) => !["initial", "animate", "exit", "transition"].includes(key)));
      return <div {...domProps}>{children}</div>;
    },
  },
}));
vi.mock("flexsearch", () => ({
  Index: class { add() {} search() { return []; } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ zh: [], en: [] }) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup(locale = "zh") {
  return render(<NextIntlClientProvider locale={locale} messages={locale === "zh" ? zh : en}><SearchModal /></NextIntlClientProvider>);
}

describe("SearchModal without control hints", () => {
  it.each(["zh", "en"])("keeps %s search and explicit close actions without initial helper copy or keyboard hints", async (locale) => {
    const messages = locale === "zh" ? zh : en;
    const { container } = setup(locale);
    fireEvent.click(screen.getByRole("button", { name: messages.search.open }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText(messages.search.loading)).toBeNull());
    expect(screen.getByRole("textbox", { name: messages.search.open })).toBeTruthy();
    expect(screen.queryByText(messages.search.hint)).toBeNull();
    expect(container.querySelector("kbd")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: messages.currents.close }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("retains unavailable state, retry and empty search results", async () => {
    mocks.fetch.mockRejectedValueOnce(new Error("offline"));
    setup();
    fireEvent.click(screen.getByRole("button", { name: zh.search.open }));
    expect(await screen.findByText(zh.search.unavailable)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: zh.search.retry }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(zh.search.unavailable)).toBeNull());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "unknown" } });
    expect(await screen.findByText(zh.search.noResults)).toBeTruthy();
  });

  it("retains keyboard opening and closing without rendering hints", () => {
    setup();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
