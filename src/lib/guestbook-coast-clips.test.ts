import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COAST_CLIPS, pickNextCoastClip } from "./guestbook-coast-clips";

describe("pickNextCoastClip", () => {
  const night = COAST_CLIPS.night;

  it("gives dawn, day, dusk and night four plates each, all on disk", () => {
    expect(COAST_CLIPS.dawn).toHaveLength(4);
    expect(COAST_CLIPS.day).toHaveLength(4);
    expect(COAST_CLIPS.dusk).toHaveLength(4);
    expect(COAST_CLIPS.night).toHaveLength(4);
    for (const clips of Object.values(COAST_CLIPS)) {
      for (const clip of clips) {
        expect(existsSync(path.join(process.cwd(), "public", clip.replace(/^\//, ""))), clip).toBe(true);
      }
    }
  });

  it("never repeats the last day clip when others exist", () => {
    const last = COAST_CLIPS.day[0] ?? "";
    expect(pickNextCoastClip(COAST_CLIPS.day, last, () => 0.9)).not.toBe(last);
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
