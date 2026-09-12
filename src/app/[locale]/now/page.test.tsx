// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import NowPage from "./page";
import { NOW_UPDATED } from "@/lib/now";

const mocks = vi.hoisted(() => ({ locale: "zh" }));

vi.mock("next-intl/server", () => ({
  setRequestLocale: (locale: string) => {
    mocks.locale = locale;
  },
  getTranslations: async () => {
    const source = mocks.locale === "zh" ? zh.now : en.now;
    const t = (key: string) => {
      if (key === "updated") return mocks.locale === "zh" ? `更新于 ${NOW_UPDATED}` : `Updated ${NOW_UPDATED}`;
      return (source as Record<string, unknown>)[key] as string;
    };
    t.raw = (key: string) => (source as Record<string, unknown>)[key];
    return t;
  },
}));
vi.mock("@/components/Navbar", () => ({ Navbar: () => <nav /> }));
vi.mock("@/components/SiteFooter", () => ({ SiteFooter: () => <footer /> }));
vi.mock("@/components/webgl/FluidBackground", () => ({ FluidBackground: () => null }));

beforeEach(() => {
  mocks.locale = "zh";
});
afterEach(cleanup);

describe("NowPage", () => {
  it.each(["zh", "en"] as const)("renders the %s short status without adding a nav entry", async (locale) => {
    mocks.locale = locale;
    const messages = locale === "zh" ? zh : en;
    render(await NowPage({ params: Promise.resolve({ locale }) }));
    expect(screen.getByRole("heading", { name: messages.now.title })).toBeTruthy();
    expect(screen.getByText(messages.now.doing[0])).toBeTruthy();
    expect(screen.getByText(messages.now.not[0])).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeTruthy();
  });
});
