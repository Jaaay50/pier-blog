// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import { CurrentsFilters } from "./CurrentsFilters";

const desktopListeners = new Set<(event: MediaQueryListEvent) => void>();
let desktopMatches = false;
const FOCUSABLE_SELECTOR_FOR_TEST =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  desktopMatches = false;
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
      matches: query === "(min-width: 1280px)" ? desktopMatches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        if (query === "(min-width: 1280px)") desktopListeners.add(listener);
      },
      removeEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        desktopListeners.delete(listener);
      },
      dispatchEvent: vi.fn(),
    })),
  });
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

  it("移动 sticky 消费 Navbar 实际高度变量", () => {
    renderFilters();
    const trigger = screen.getByRole("button", { name: "筛选" });
    const mobileBar = trigger.parentElement;
    expect(mobileBar?.className).toContain("top-[var(--site-nav-height)]");
  });
});

describe("CurrentsFilters desktop collapse", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
    });
    // jsdom 默认 rect 全 0，会让挂载时 delta = -57 直接判定折叠；
    // 统一让所有元素默认位于折叠线之下（展开态），单个测试再用 mockSentinel 覆盖。
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      top: 400,
      left: 0,
      right: 1280,
      bottom: 401,
      width: 1280,
      height: 1,
      x: 0,
      y: 400,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockMarker(top: number) {
    const marker = document.querySelector<HTMLDivElement>(
      "[data-currents-collapse-marker]",
    );
    if (!marker) throw new Error("collapse marker not found");
    // 覆盖实例方法（优先于 prototype spy）
    marker.getBoundingClientRect = () =>
      ({
        top,
        left: 0,
        right: 1280,
        bottom: top + 1,
        width: 1280,
        height: 1,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
  }

  it("展开区位于普通文档流，不用 sticky，初始可见可交互", () => {
    const { container } = renderFilters();
    const expanded = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-expanded]",
    );
    expect(expanded).not.toBeNull();
    expect(expanded!.className).not.toContain("sticky");
    expect(expanded!.hasAttribute("inert")).toBe(false);
    expect(expanded!.getAttribute("aria-hidden")).toBe("false");
    expect(expanded!.className).not.toContain("opacity-0");
  });

  it("紧凑工具栏用零高度 sticky wrapper，初始不可见不可交互", () => {
    const { container } = renderFilters();
    const stickyWrapper = container.querySelector<HTMLDivElement>(
      ".sticky.top-\\[var\\(--site-nav-height\\)\\].z-30.hidden.h-0",
    );
    expect(stickyWrapper).not.toBeNull();
    const toolbar = stickyWrapper?.querySelector<HTMLDivElement>(
      "[data-currents-desktop-toolbar]",
    );
    expect(toolbar).not.toBeNull();
    expect(toolbar!.hasAttribute("inert")).toBe(true);
    expect(toolbar!.getAttribute("aria-hidden")).toBe("true");
    expect(toolbar!.className).toContain("opacity-0");
  });

  it("折叠 marker 位于完整展开筛选区之后，不会留下前置占位或提前遮挡正文", () => {
    const { container } = renderFilters();
    const expanded = container.querySelector(
      "[data-currents-desktop-expanded]",
    );
    const marker = container.querySelector("[data-currents-collapse-marker]");
    expect(expanded).not.toBeNull();
    expect(marker).not.toBeNull();
    expect(
      expanded!.compareDocumentPosition(marker!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(expanded!.className).not.toContain("opacity-0");
  });

  it("marker 越过折叠线后才进入紧凑态（展开→紧凑需向下至负值）", async () => {
    const { container } = renderFilters();
    const expanded = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-expanded]",
    );
    const toolbar = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-toolbar]",
    );

    // 初始 delta = 0（marker 顶部与 navbar 底部重叠），仍在展开态
    mockMarker(57);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(false);
    expect(toolbar!.hasAttribute("inert")).toBe(true);

    // delta = -1（刚越过折叠线），切换到紧凑态
    mockMarker(56);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);
    expect(toolbar!.hasAttribute("inert")).toBe(false);
  });

  it("紧凑态向上回到折叠线以上 32px 才恢复展开态（滞回）", async () => {
    const { container } = renderFilters();
    const expanded = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-expanded]",
    );

    // 先切到紧凑态（delta < 0）
    mockMarker(50);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);

    // 向上回到折叠线以下 30px（delta = 30），未达滞回阈值，仍紧凑
    mockMarker(87);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);

    // 向上到折叠线以下正好 32px（delta = 32），达到滞回，恢复展开
    mockMarker(89);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(false);
  });

  it("临界点连续反向小幅滚动（落在滞回区内）不反复切换", async () => {
    const { container } = renderFilters();
    const expanded = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-expanded]",
    );

    // 初始展开态，marker top=57 → delta=0
    mockMarker(57);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    const initialExpanded = expanded!.hasAttribute("inert");
    expect(initialExpanded).toBe(false);

    // 向下滚到 delta=-5，切换到紧凑态
    mockMarker(52);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);

    // 向上回弹到 delta=10（滞回区内），不切换
    mockMarker(67);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);

    // 再向下到 delta=-3，仍紧凑（同方向只切一次）
    mockMarker(54);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);

    // 向上到 delta=32，越过滞回阈值，恢复展开
    mockMarker(89);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(false);

    // 展开态后向下回落到 delta=20（未越折叠线），保持展开
    mockMarker(77);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(false);
  });

  it("工具栏隐藏时 inert，折叠后工具栏可交互且展开区保持文档流", () => {
    const { container } = renderFilters();
    const expanded = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-expanded]",
    );
    const toolbar = container.querySelector<HTMLDivElement>(
      "[data-currents-desktop-toolbar]",
    );

    // 初始展开态
    expect(expanded!.hasAttribute("inert")).toBe(false);
    expect(expanded!.querySelectorAll("button").length).toBeGreaterThan(0);
    expect(toolbar!.hasAttribute("inert")).toBe(true);

    // 切到紧凑态后，展开区保留文档流高度但退出交互树；工具栏成为可交互层。
    mockMarker(50);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
    expect(expanded!.hasAttribute("inert")).toBe(true);
    expect(expanded!.getAttribute("aria-hidden")).toBe("true");
    expect(toolbar!.hasAttribute("inert")).toBe(false);
    expect(toolbar!.querySelectorAll("button").length).toBeGreaterThan(0);
  });
});

describe("CurrentsFilters desktop more filters", () => {
  beforeEach(() => {
    desktopMatches = true;
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      top: 400,
      left: 0,
      right: 1280,
      bottom: 401,
      width: 1280,
      height: 1,
      x: 0,
      y: 400,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function enterCollapsed(container: HTMLElement) {
    const marker = container.querySelector<HTMLDivElement>(
      "[data-currents-collapse-marker]",
    );
    if (!marker) throw new Error("collapse marker not found");
    marker.getBoundingClientRect = () =>
      ({
        top: 50,
        left: 0,
        right: 1280,
        bottom: 51,
        width: 1280,
        height: 1,
        x: 0,
        y: 50,
        toJSON: () => ({}),
      }) as DOMRect;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.runAllTimers();
    });
  }

  function openMore(container: HTMLElement) {
    enterCollapsed(container);
    const trigger = screen.getByRole("button", { name: "更多筛选" });
    fireEvent.click(trigger);
    const panel = screen.getByRole("dialog", { name: "更多筛选" });
    return { trigger, panel };
  }

  it("打开后焦点进入 overlay，Escape 关闭并恢复到触发按钮", () => {
    const { container } = renderFilters();
    const { trigger, panel } = openMore(container);
    const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR_FOR_TEST);
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("点击 overlay 外部关闭，点击内部保持打开", () => {
    const { container } = renderFilters();
    const { trigger, panel } = openMore(container);

    fireEvent.pointerDown(panel.querySelector("button")!);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerDown(screen.getByRole("button", { name: "页面外按钮" }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("退出期间 overlay 立即 inert/aria-hidden", () => {
    const { container } = renderFilters();
    const { trigger, panel } = openMore(container);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    const layer = panel.closest<HTMLElement>(
      "[data-currents-desktop-more-layer]",
    );
    expect(layer?.hasAttribute("inert")).toBe(true);
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    expect(panel.isConnected).toBe(true);
  });

  it("1440→1279 时关闭 overlay、隔离退出节点并恢复焦点", () => {
    const { container } = renderFilters();
    const { trigger, panel } = openMore(container);

    desktopMatches = false;
    act(() => {
      for (const listener of desktopListeners) {
        listener({ matches: false } as MediaQueryListEvent);
      }
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    const layer = panel.closest<HTMLElement>(
      "[data-currents-desktop-more-layer]",
    );
    expect(layer?.hasAttribute("inert")).toBe(true);
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    expect(document.activeElement).toBe(trigger);
  });
});
