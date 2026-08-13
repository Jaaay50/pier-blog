// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentsShell } from "./CurrentsShell";

const mockPathname = vi.fn<() => string>(() => "/currents");
const mockSearchParams = vi.fn<() => URLSearchParams>(() => new URLSearchParams());

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams(),
}));

const messages = {
  currentsNav: {
    brand: "潮汐",
    brandTagline: "AI 动态",
    navLabel: "潮汐导航",
    featured: "精选",
    all: "全部动态",
    hot: "热点榜",
    models: "模型榜",
    daily: "AI 日报",
    topics: "主题",
    favorites: "收藏",
    agent: "Agent 接入",
    search: "搜索",
    changelog: "更新日志",
    feedback: "反馈",
    menuOpen: "打开导航",
    menuClose: "关闭导航",
  },
};

const MAIN_LABELS = ["精选", "全部动态", "热点榜", "模型榜", "AI 日报", "主题", "收藏", "Agent 接入"];
const AUX_LABELS = ["搜索", "更新日志", "反馈"];

function renderShell() {
  return render(
    <NextIntlClientProvider locale="zh" messages={messages}>
      <CurrentsShell>
        <div>content</div>
      </CurrentsShell>
    </NextIntlClientProvider>,
  );
}

/** 桌面侧栏 <nav>（面板未打开时唯一的导航 landmark） */
function getSideNav() {
  return screen.getAllByRole("navigation", { name: "潮汐导航" })[0];
}

beforeEach(() => {
  mockPathname.mockReturnValue("/currents");
  mockSearchParams.mockReturnValue(new URLSearchParams());
});

afterEach(() => cleanup());

describe("CurrentsShell", () => {
  it("渲染 8 个主导航项与 3 个辅助项", () => {
    renderShell();
    const nav = getSideNav();
    const links = nav.querySelectorAll("a");
    expect(links).toHaveLength(10); // 8 主导航 + 更新日志/反馈（搜索是 button）
    const texts = Array.from(nav.querySelectorAll("a, button")).map((el) => el.textContent);
    for (const label of [...MAIN_LABELS, ...AUX_LABELS]) {
      expect(texts).toContain(label);
    }
    // 收藏入口落在首页收藏视图
    const favorites = screen.getByRole("link", { name: "收藏" });
    expect(favorites.getAttribute("href")).toBe("/currents?view=all&favorites=1");
  });

  it("模型榜路径高亮 models 项（含详情/方法子路径）", () => {
    mockPathname.mockReturnValue("/currents/models/methodology");
    renderShell();
    expect(screen.getByRole("link", { name: "模型榜" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "热点榜" }).getAttribute("aria-current")).toBeNull();
  });

  it("当前路径高亮 aria-current", () => {
    mockPathname.mockReturnValue("/currents/hot");
    renderShell();
    expect(screen.getByRole("link", { name: "热点榜" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "精选" }).getAttribute("aria-current")).toBeNull();
  });

  it("/currents?view=all&favorites=1 时收藏项高亮", () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("view=all&favorites=1"));
    renderShell();
    expect(screen.getByRole("link", { name: "收藏" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "全部动态" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "精选" }).getAttribute("aria-current")).toBeNull();
  });

  it("/feedback 复用产品导航并高亮反馈入口", () => {
    mockPathname.mockReturnValue("/feedback");
    renderShell();
    expect(screen.getByRole("link", { name: "反馈" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("1280–1535px 渐进预留侧栏空间，1536px 无缝切换为网格", () => {
    renderShell();
    const content = screen.getByText("content").parentElement;
    const layout = content?.parentElement;
    expect(layout?.className).toContain(
      "min-[1280px]:ml-[clamp(0px,calc(100vw-1280px),16rem)]",
    );
    expect(layout?.className).toContain("2xl:grid-cols-[224px_minmax(0,1fr)]");
    expect(layout?.className.split(" ")).not.toContain(
      "xl:grid-cols-[224px_minmax(0,1fr)]",
    );
  });

  it("移动端产品导航按钮 aria-expanded 开合面板", () => {
    renderShell();
    // 文字产品导航按钮：包含「潮汐 · 精选」与打开文案
    const button = screen.getByRole("button", { name: /潮汐/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "潮汐导航" })).toBeTruthy();

    // Esc 关闭
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
