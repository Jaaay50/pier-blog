// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuestbookTide } from "./GuestbookTide";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GuestbookTide", () => {
  it("renders an accessible canvas for the tide of bottles", () => {
    render(
      <GuestbookTide
        entries={[
          {
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            nickname: "Visitor_aa00",
            message: "drift",
            createdAt: "2026-09-09T12:00:00.000Z",
          },
        ]}
        selectedId={null}
        onSelect={() => {}}
        onActivate={() => {}}
        canvasLabel="tide canvas"
      />,
    );
    expect(screen.getByTestId("guestbook-tide")).toBeTruthy();
    expect(screen.getByTestId("guestbook-canvas").getAttribute("aria-label")).toBe("tide canvas");
  });
});
