// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import { fetchHot, fetchTopics } from "@/lib/currents/api";
import type { CurrentsHotResponse, CurrentsTopicsResponse } from "@/lib/currents/types";
import { CurrentsHotClient } from "./CurrentsHotClient";
import { CurrentsTopicsClient } from "./CurrentsTopicsClient";

vi.mock("@/lib/currents/api", () => ({ fetchHot: vi.fn(), fetchTopics: vi.fn() }));
vi.mock("@/components/TransitionLink", () => ({ TransitionLink: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
const hot: CurrentsHotResponse = { schemaVersion: 2, type: "all", items: [], watching: [], meta: { windowHours: 24, mainCount: 0, watchingCount: 0, generatedAt: "2026-09-08T00:00:00Z" } };
const topics: CurrentsTopicsResponse = { schemaVersion: 1, groups: [{ id: "directions", name: "研究方向" }], topics: [{ id: "agents", group: "directions", name: "智能体", count: 3, featuredCount: 1, preview: [] }], meta: { generatedAt: "2026-09-08T00:00:00Z" } };
function renderWithMessages(children: React.ReactNode) { return render(<NextIntlClientProvider locale="zh" messages={zh}>{children}</NextIntlClientProvider>); }
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);

describe("Currents ISR data islands", () => {
  it("hot renders seeded empty state immediately, and current tab is a no-op", () => {
    renderWithMessages(<CurrentsHotClient initial={hot} />);
    expect(screen.getByText(zh.currents.hotEmpty)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: zh.currents.hotTypeAll }));
    expect(fetchHot).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hot leaves and returns to the SSR default without an endless loading state", async () => {
    vi.mocked(fetchHot).mockResolvedValue(hot);
    renderWithMessages(<CurrentsHotClient initial={hot} />);
    fireEvent.click(screen.getByRole("tab", { name: zh.currents.hotTypeNews }));
    await waitFor(() => expect(fetchHot).toHaveBeenLastCalledWith("zh", 30, expect.anything(), "news"));
    fireEvent.click(screen.getByRole("tab", { name: zh.currents.hotTypeAll }));
    await waitFor(() => expect(fetchHot).toHaveBeenLastCalledWith("zh", 30, expect.anything(), "all"));
    expect(screen.getByText(zh.currents.hotEmpty)).toBeTruthy();
  });

  it("topics renders server items immediately without a duplicate fetch", () => {
    renderWithMessages(<CurrentsTopicsClient initial={topics} />);
    expect(screen.getByRole("link", { name: "智能体" })).toBeTruthy();
    expect(fetchTopics).not.toHaveBeenCalled();
  });

  it("failed initial fetch falls back to recoverable client loading", async () => {
    vi.mocked(fetchTopics).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(topics);
    renderWithMessages(<CurrentsTopicsClient initial={null} />);
    fireEvent.click(await screen.findByRole("button", { name: zh.currents.retry }));
    expect(await screen.findByRole("link", { name: "智能体" })).toBeTruthy();
  });
});
