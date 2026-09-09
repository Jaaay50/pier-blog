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
vi.mock("@/components/webgl/FluidBackground", () => ({ FluidBackground: () => null }));
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
    initialEntries,
  }: {
    initialEntries: Array<{ message: string }>;
  }) => <div data-testid="guestbook-board">{initialEntries[0]?.message}</div>,
}));

beforeEach(() => {
  mocks.locale = "zh";
});
afterEach(cleanup);

describe("GuestbookPage", () => {
  it.each(["zh", "en"] as const)("renders %s hero copy and hydrates the board with fetched entries", async (locale) => {
    mocks.locale = locale;
    const messages = locale === "zh" ? zh : en;
    render(await GuestbookPage({ params: Promise.resolve({ locale }) }));
    expect(screen.getByText(messages.guestbook.title)).toBeTruthy();
    expect(screen.getByText(messages.guestbook.subtitle)).toBeTruthy();
    expect(screen.getByTestId("guestbook-board").textContent).toBe("tide mark");
  });
});
