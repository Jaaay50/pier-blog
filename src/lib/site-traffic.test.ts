/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { declinedBrowserTracking, sendSiteVisit, shouldSkipTrafficPath } from "./site-traffic";

describe("blog traffic beacon", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie.split(";").forEach((part) => {
      const name = part.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  });

  it("skips api and og paths", () => {
    expect(shouldSkipTrafficPath("/api/csp-report")).toBe(true);
    expect(shouldSkipTrafficPath("/og")).toBe(true);
    expect(shouldSkipTrafficPath("/zh")).toBe(false);
  });

  it("does not invent a visitor when tracking is declined", () => {
    vi.stubGlobal("navigator", { doNotTrack: "1", sendBeacon: vi.fn() });
    expect(declinedBrowserTracking()).toBe(true);
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => new Response(null, { status: 204 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    sendSiteVisit("/zh");
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}")) as {
      visitorId?: string;
      site?: string;
    };
    expect(body.visitorId).toBeUndefined();
    expect(body.site).toBe("blog");
  });
});
