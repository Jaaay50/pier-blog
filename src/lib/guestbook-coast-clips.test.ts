import { describe, expect, it } from "vitest";
import { COAST_CLIPS, pickNextCoastClip } from "./guestbook-coast-clips";

describe("pickNextCoastClip", () => {
  const night = COAST_CLIPS.night;

  it("returns the only clip when a period has one plate", () => {
    expect(pickNextCoastClip(COAST_CLIPS.day, "/guestbook/coast-day.webm", () => 0.9)).toBe(
      "/guestbook/coast-day.webm",
    );
  });

  it("never repeats the last night clip when others exist", () => {
    const last = night[0] ?? "";
    const seen = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const next = pickNextCoastClip(night, last, () => (i + 0.5) / 20);
      expect(next).not.toBe(last);
      seen.add(next);
    }
    expect(seen.has(last)).toBe(false);
    expect(seen.size).toBe(night.length - 1);
  });

  it("picks across the full set on a first visit", () => {
    expect(pickNextCoastClip(night, null, () => 0)).toBe(night[0]);
    expect(pickNextCoastClip(night, null, () => 0.99)).toBe(night[night.length - 1]);
  });
});
