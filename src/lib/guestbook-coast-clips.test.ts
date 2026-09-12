import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COAST_CLIPS, pickNextCoastClip } from "./guestbook-coast-clips";

describe("pickNextCoastClip", () => {
  it("gives one idle plate per period, all on disk", () => {
    expect(COAST_CLIPS.dawn).toHaveLength(1);
    expect(COAST_CLIPS.day).toHaveLength(1);
    expect(COAST_CLIPS.dusk).toHaveLength(1);
    expect(COAST_CLIPS.night).toHaveLength(1);
    for (const clips of Object.values(COAST_CLIPS)) {
      for (const clip of clips) {
        expect(existsSync(path.join(process.cwd(), "public", clip.replace(/^\//, ""))), clip).toBe(true);
      }
    }
  });

  it("returns the only clip when a period has one plate", () => {
    const only = COAST_CLIPS.day[0] ?? "";
    expect(pickNextCoastClip(COAST_CLIPS.day, only, () => 0.9)).toBe(only);
    expect(pickNextCoastClip(COAST_CLIPS.day, null, () => 0.99)).toBe(only);
  });

  it("never repeats the last clip when others exist", () => {
    const pool = ["/a.webm", "/b.webm", "/c.webm"];
    expect(pickNextCoastClip(pool, "/a.webm", () => 0.9)).not.toBe("/a.webm");
  });
});
