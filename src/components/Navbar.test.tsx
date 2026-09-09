// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import { Navbar } from "./Navbar";

let pathname = "/blog";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => pathname }));
vi.mock("./TransitionLink", () => ({
  TransitionLink: ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("./MagneticWrapper", () => ({
  MagneticWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("./SearchModal", () => ({ SearchModal: () => <button>Search</button> }));
vi.mock("./LanguageToggle", () => ({ LanguageToggle: () => <button>Language</button> }));
vi.mock("./ThemeToggle", () => ({ ThemeToggle: () => <button>Theme</button> }));

beforeEach(() => {
  pathname = "/blog";
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Navbar shared shell", () => {
  it.each(["zh", "en"])("includes all five visible %s labels in desktop and mobile accessible names", (locale) => {
    const messages = locale === "zh" ? zh : en;
    const { container } = render(
      <NextIntlClientProvider locale={locale} messages={messages}><Navbar /></NextIntlClientProvider>
    );
    const checkNames = (count: number) => {
      for (const key of ["blog", "currents", "portfolio", "lab", "about"] as const) {
        const name = `${messages.nav[key]} — ${messages.nav[`${key}Hint`]}`;
        const links = screen.getAllByRole("link", { name });
        expect(links).toHaveLength(count);
        for (const link of links) expect(link.textContent).toBe(messages.nav[key]);
      }
    };
    checkNames(1);
    fireEvent.click(screen.getByRole("button", { name: messages.nav.menuOpen }));
    checkNames(2);
    expect(container.querySelectorAll("a[title][aria-label]")).toHaveLength(10);
  });
  it.each(["zh", "en"])("keeps the same shell across %s routes", (locale) => {
    const navbar = () => (
      <NextIntlClientProvider locale={locale} messages={locale === "zh" ? zh : en}>
        <Navbar />
      </NextIntlClientProvider>
    );
    const { container, rerender } = render(navbar());
    const shell = container.querySelector("[data-site-navbar]")?.firstElementChild;

    for (const route of ["/blog", "/currents", "/about", "/currents/hot", "/currents/item", "/feedback", "/portfolio", "/lab", "/blog"]) {
      pathname = route;
      rerender(navbar());
      const currentShell = container.querySelector("[data-site-navbar]")?.firstElementChild;
      expect(currentShell).toBe(shell);
      expect(currentShell?.classList.contains("site-shell")).toBe(true);
      expect(currentShell?.classList.contains("py-4")).toBe(true);
      expect(container.querySelector(".currents-shell-container")).toBeNull();
    }
  });
});
