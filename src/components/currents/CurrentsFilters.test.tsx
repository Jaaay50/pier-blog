// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import { CurrentsFilters } from "./CurrentsFilters";

const desktopListeners = new Set<(event: MediaQueryListEvent) => void>();

function renderFilters() {
  return render(
    <NextIntlClientProvider locale="zh" messages={{ currents: zh.currents }}>
      <button type="button">页面外按钮</button>
      <CurrentsFilters
        view="selected"
        onViewChange={vi.fn()}
        category="all"
        onCategoryChange={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
        favoritesOnly={false}
        onFavoritesOnlyChange={vi.fn()}
        sources={[]}
        source=""
        onSourceChange={vi.fn()}
        minScore=""
        onMinScoreChange={vi.fn()}
        density="standard"
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  desktopListeners.clear();
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (query === "(min-width: 1280px)") desktopListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        desktopListeners.delete(listener);
      },
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class IntersectionObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "0px";
      thresholds = [0];
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  vi.unstubAllGlobals();
});

describe("CurrentsFilters mobile sheet", () => {
  it("锁定页面、隔离背景并把键盘焦点限制在面板内", () => {
    renderFilters();
    const outside = screen.getByRole("button", { name: "页面外按钮" });
    const trigger = screen.getByRole("button", { name: "筛选" });

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "筛选" });
    const elements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = elements[0];
    const last = elements[elements.length - 1];

    expect(document.body.style.overflow).toBe("hidden");
    expect(outside.getAttribute("aria-hidden")).toBe("true");
    expect(outside.inert).toBe(true);
    expect(document.activeElement).toBe(first);

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    outside.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
    expect(outside.hasAttribute("aria-hidden")).toBe(false);
    expect(outside.inert).not.toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("进入桌面断点时关闭面板并恢复页面状态", () => {
    renderFilters();
    const trigger = screen.getByRole("button", { name: "筛选" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      for (const listener of desktopListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
  });

  it("移动与桌面 sticky 都消费 Navbar 实际高度变量", () => {
    renderFilters();
    const trigger = screen.getByRole("button", { name: "筛选" });
    const mobileBar = trigger.parentElement;
    expect(mobileBar?.className).toContain("top-[var(--site-nav-height)]");

    const desktop = document.querySelector(".xl\\:block.sticky");
    expect(desktop?.className).toContain("top-[var(--site-nav-height)]");
  });
});
