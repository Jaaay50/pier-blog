// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import GuestbookPage from "./page";

const mocks = vi.hoisted(() => ({ locale: "zh" }));

vi.mock("next-intl/server", () => ({
  setRequestLocale: (locale: string) => {
    mocks.locale = locale;
  },
  getTranslations: async () => (key: string) => {
    const source = mocks.locale === "zh" ? zh : en;
    return (source.guestbook as Record<string, string>)[key] ?? key;
  },
}));
vi.mock("@/components/Navbar", () => ({ Navbar: () => <nav /> }));
vi.mock("@/components/SiteFooter", () => ({ SiteFooter: () => <footer /> }));
vi.mock("@/lib/guestbook", () => ({
  fetchGuestbookEntries: async () => ({
    schemaVersion: 1,
    entries: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        nickname: "Visitor_ab12",
        message: "tide mark",
        createdAt: "2026-09-09T12:00:00.000Z",
      },
    ],
    nextCursor: null,
  }),
}));
vi.mock("@/components/guestbook/GuestbookBoard", () => ({
  GuestbookBoard: ({
    locale,
    initialEntries,
    initialError,
  }: {
    locale: string;
    initialEntries: Array<{ message: string }>;
    initialError?: boolean;
  }) => (
    <div data-testid="guestbook-board" data-locale={locale} data-error={String(initialError ?? false)}>
      {initialEntries[0]?.message}
    </div>
  ),
}));

beforeEach(() => {
  mocks.locale = "zh";
});
afterEach(cleanup);

describe("GuestbookPage", () => {
  it.each(["zh", "en"] as const)("%s：把首屏数据交给潮水面板，页面自身不再渲染 PageHero", async (locale) => {
    mocks.locale = locale;
    render(await GuestbookPage({ params: Promise.resolve({ locale }) }));
    const board = screen.getByTestId("guestbook-board");
    expect(board.textContent).toBe("tide mark");
    expect(board.getAttribute("data-locale")).toBe(locale);
    expect(board.getAttribute("data-error")).toBe("false");
    // 标题/副标题现在由 GuestbookBoard 浮在水面上渲染，页面不应再出现第二份
    const messages = locale === "zh" ? zh : en;
    expect(screen.queryByText(messages.guestbook.subtitle)).toBeNull();
  });
});
