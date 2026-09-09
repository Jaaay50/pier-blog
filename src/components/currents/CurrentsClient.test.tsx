// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh.json";
import { fetchItems, fetchSources } from "@/lib/currents/api";
import type { CurrentsItemsResponse, CurrentsListItem } from "@/lib/currents/types";
import { CurrentsClient } from "./CurrentsClient";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("@/i18n/navigation", () => ({ useRouter: () => router }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (notify) => { window.addEventListener("test:history", notify); return () => window.removeEventListener("test:history", notify); },
      () => window.location.search,
      () => "",
    );
    return new URLSearchParams(search);
  },
}));
vi.mock("@/lib/currents/api", () => ({ fetchItems: vi.fn(), fetchSources: vi.fn() }));
vi.mock("@/lib/currents/useFavorites", () => ({ useFavorites: () => [] }));
vi.mock("@/lib/currents/useDensity", () => ({ useDensity: () => "standard" }));
vi.mock("./CurrentsHighlights", () => ({ CurrentsHighlights: () => <section aria-label="Highlights"><h2>Featured story</h2><p>A populated lead story and supporting reports.</p></section> }));
vi.mock("./CurrentsTimeline", () => ({ CurrentsTimeline: ({ items }: { items: CurrentsListItem[] }) => <ul>{items.map((item) => <li key={item.id}>{item.title}</li>)}</ul> }));
vi.mock("./CurrentsFilters", () => ({ CurrentsFilters: ({ view, onViewChange }: { view: string; onViewChange: (view: string) => void }) => <div>{["selected", "all", "papers"].map((key) => <button key={key} type="button" aria-pressed={view === key} onClick={() => onViewChange(key)}>{key}</button>)}</div> }));

function response(title: string, hasMore = false): CurrentsItemsResponse {
  return {
    items: [{ id: title, title, summary: null, reason: null, category: "papers", score: 80, tags: [], imageUrl: null, author: null, sourceId: null, canonicalUrl: null, publishedAt: null, isFeatured: true }],
    hasMore, nextCursor: hasMore ? `cursor-${title}` : null, meta: { generatedAt: "2026-09-08T00:00:00Z", totalApprox: 1 },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function renderFeed(hasMore = false) {
  const initial = response("SSR selected", hasMore);
  return render(<NextIntlClientProvider locale="zh" messages={zh}><CurrentsClient initial={{ ...initial, sources: [] }} /></NextIntlClientProvider>);
}

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, "", "/zh/currents");
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "pushState").mockImplementation((...args) => { push(...args); window.dispatchEvent(new Event("test:history")); });
  vi.spyOn(window.history, "replaceState").mockImplementation((...args) => { replace(...args); window.dispatchEvent(new Event("test:history")); });
  vi.mocked(fetchSources).mockResolvedValue({ sources: [] });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("CurrentsClient query navigation", () => {
  it("keeps all view controls before populated highlights and the timeline", () => {
    renderFeed();
    const highlights = screen.getByRole("region", { name: "Highlights" });
    const timeline = screen.getByRole("list");
    expect(screen.getByRole("heading", { name: "Featured story" })).toBeTruthy();
    for (const view of ["selected", "all", "papers"]) {
      const button = screen.getByRole("button", { name: view });
      expect(button.compareDocumentPosition(highlights) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(highlights.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses SSR once; selected -> all -> papers -> selected finishes without RSC navigation", async () => {
    vi.mocked(fetchItems).mockImplementation(async ({ view }) => response(`Loaded ${view}`));
    renderFeed();
    expect(screen.getByText("SSR selected")).toBeTruthy();
    expect(fetchItems).not.toHaveBeenCalled();
    for (const view of ["all", "papers", "selected"]) {
      fireEvent.click(screen.getByRole("button", { name: view }));
      expect(await screen.findByText(`Loaded ${view}`)).toBeTruthy();
      expect(window.location.pathname).toBe("/zh/currents");
      expect(new URLSearchParams(window.location.search).get("view")).toBe(view === "selected" ? null : view);
    }
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(window.history.pushState).toHaveBeenCalledTimes(3);
  });

  it("only the final selection wins when responses arrive in reverse order", async () => {
    const all = deferred<CurrentsItemsResponse>();
    const papers = deferred<CurrentsItemsResponse>();
    vi.mocked(fetchItems).mockImplementation(({ view }) => view === "all" ? all.promise : papers.promise);
    renderFeed();
    fireEvent.click(screen.getByRole("button", { name: "all" }));
    fireEvent.click(screen.getByRole("button", { name: "papers" }));
    await act(async () => papers.resolve(response("Current papers")));
    await act(async () => all.resolve(response("Obsolete all")));
    expect(screen.getByText("Current papers")).toBeTruthy();
    expect(screen.queryByText("Obsolete all")).toBeNull();
    expect(vi.mocked(fetchItems).mock.calls[0][1]?.aborted).toBe(true);
  });

  it("aborts stale pagination and never appends it into a new view", async () => {
    const more = deferred<CurrentsItemsResponse>();
    vi.mocked(fetchItems).mockImplementation(({ cursor }) => cursor ? more.promise : Promise.resolve(response("Paper result")));
    renderFeed(true);
    fireEvent.click(screen.getByRole("button", { name: zh.currents.loadMore }));
    fireEvent.click(screen.getByRole("button", { name: "papers" }));
    await screen.findByText("Paper result");
    await act(async () => more.resolve(response("Old page")));
    expect(screen.queryByText("Old page")).toBeNull();
    expect(vi.mocked(fetchItems).mock.calls[0][1]?.aborted).toBe(true);
  });

  it("normalizes invalid views and reacts to history restoration", async () => {
    vi.mocked(fetchItems).mockImplementation(async ({ view }) => response(`Restored ${view}`));
    window.history.replaceState(null, "", "/zh/currents?view=invalid");
    renderFeed();
    expect(screen.getByRole("button", { name: "selected" }).getAttribute("aria-pressed")).toBe("true");
    act(() => window.history.replaceState(null, "", "/zh/currents?view=papers"));
    await waitFor(() => expect(screen.getByText("Restored papers")).toBeTruthy());
  });
});
