// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoastalScene } from "./CoastalScene";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("CoastalScene", () => {
  afterEach(() => { document.body.innerHTML = ""; });
  it("renders the four self-hosted backgrounds and content", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00.000Z"));
    const { container } = render(<CoastalScene label="coast" />);
    expect(screen.getByTestId("guestbook-coastal-scene").dataset.coastalTime).toBe("day");
    expect(screen.getByRole("region", { name: "coast" })).toBeTruthy();
    expect(container.querySelectorAll(".guestbook-coastal-layer")).toHaveLength(4);
    expect(container.querySelector(".guestbook-coastal-layer-dawn")).toBeTruthy();
    expect(container.querySelector(".guestbook-coastal-layer-day")).toBeTruthy();
    expect(container.querySelector(".guestbook-coastal-layer-dusk")).toBeTruthy();
    expect(container.querySelector(".guestbook-coastal-layer-night")).toBeTruthy();
    expect(container.textContent).not.toContain("Bottles");
    expect(container.querySelector("[style*='background-image']")).toBeNull();
  });

  it("mounts a looping plate when motion is allowed", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    Object.defineProperty(HTMLVideoElement.prototype, "play", {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    Object.defineProperty(HTMLVideoElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00.000Z"));
    const { container } = render(<CoastalScene label="coast" />);
    const video = container.querySelector('[data-testid="guestbook-coastal-video"]') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.getAttribute("src")?.startsWith("/guestbook/coast-day")).toBe(true);
    expect(video.getAttribute("poster")).toBe("/guestbook/coast-day.webp");
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(container.querySelectorAll("video")).toHaveLength(1);
  });

  it("refreshing night picks a different clip than last time", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    Object.defineProperty(HTMLVideoElement.prototype, "play", {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    Object.defineProperty(HTMLVideoElement.prototype, "pause", {
      configurable: true,
      value: vi.fn(),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));
    window.localStorage.setItem("guestbook-coast-last:night", "/guestbook/coast-night-0.webm");
    const first = render(<CoastalScene label="coast" />);
    const firstSrc = first.container.querySelector("video")?.getAttribute("src");
    expect(firstSrc).toBeTruthy();
    expect(firstSrc).not.toBe("/guestbook/coast-night-0.webm");
    first.unmount();
    window.localStorage.setItem("guestbook-coast-last:night", firstSrc ?? "");
    const second = render(<CoastalScene label="coast" />);
    const secondSrc = second.container.querySelector("video")?.getAttribute("src");
    expect(secondSrc).toBeTruthy();
    expect(secondSrc).not.toBe(firstSrc);
  });

  it("picks a bottle when the plate is clicked", () => {
    const onPick = vi.fn();
    render(<CoastalScene label="coast" onPick={onPick} />);
    fireEvent.click(screen.getByTestId("guestbook-coastal-scene"));
    expect(onPick).toHaveBeenCalledOnce();
    expect(screen.getByTestId("guestbook-coastal-scene").className).toContain("is-pickable");
  });

  it("changes only after crossing a period boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T08:58:00.000Z"));
    render(<CoastalScene label="coast" />);
    const scene = screen.getAllByTestId("guestbook-coastal-scene").at(-1)!;
    expect(scene.dataset.coastalTime).toBe("day");
    act(() => { vi.setSystemTime(new Date("2026-09-11T09:00:00.000Z")); vi.advanceTimersByTime(120_000); });
    expect(scene.dataset.coastalTime).toBe("dusk");
  });
});
