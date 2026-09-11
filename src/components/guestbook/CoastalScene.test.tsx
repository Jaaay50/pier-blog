// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoastalScene } from "./CoastalScene";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CoastalScene", () => {
  afterEach(() => { document.body.innerHTML = ""; });
  it("renders the four self-hosted backgrounds and content", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T00:00:00.000Z"));
    const { container } = render(<CoastalScene label="coast" title="Bottles" description="Notes" timeLabel={{ dawn: "Dawn", day: "Day", dusk: "Dusk", night: "Night" }}><span>tide</span></CoastalScene>);
    expect(screen.getByTestId("guestbook-coastal-scene").dataset.coastalTime).toBe("day");
    expect(screen.getByRole("region", { name: "coast" }).textContent).toContain("tide");
    expect(container.querySelectorAll(".guestbook-coastal-layer")).toHaveLength(4);
    expect(container.querySelector(".guestbook-coastal-layer-dawn")).toBeTruthy();
    expect(container.querySelector(".guestbook-coastal-layer-day")).toBeTruthy();
    expect(container.querySelector(".guestbook-coastal-layer-dusk")).toBeTruthy();
    expect(container.querySelector(".guestbook-coastal-layer-night")).toBeTruthy();
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
    const { container } = render(<CoastalScene label="coast" title="Bottles" description="Notes" timeLabel={{ dawn: "Dawn", day: "Day", dusk: "Dusk", night: "Night" }}><span /></CoastalScene>);
    const video = container.querySelector('[data-testid="guestbook-coastal-video"]') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.getAttribute("src")).toBe("/guestbook/coast-day.webm");
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
  });

  it("changes only after crossing a period boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T08:58:00.000Z"));
    render(<CoastalScene label="coast" title="Bottles" description="Notes" timeLabel={{ dawn: "Dawn", day: "Day", dusk: "Dusk", night: "Night" }}><span /></CoastalScene>);
    const scene = screen.getAllByTestId("guestbook-coastal-scene").at(-1)!;
    expect(scene.dataset.coastalTime).toBe("day");
    act(() => { vi.setSystemTime(new Date("2026-09-11T09:00:00.000Z")); vi.advanceTimersByTime(120_000); });
    expect(scene.dataset.coastalTime).toBe("dusk");
  });
});
