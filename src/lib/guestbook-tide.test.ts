import { describe, expect, it } from "vitest";
import type { GuestbookEntry } from "./guestbook";
import {
  bottleAge,
  createBottle,
  hash32,
  hitTest,
  scaleBottles,
  stepBottles,
  syncBottles,
} from "./guestbook-tide";

const world = { width: 800, height: 480 };

function entry(id: string, createdAt = "2026-09-01T00:00:00.000Z"): GuestbookEntry {
  return { id, nickname: "Visitor_ab12", message: "note", createdAt };
}

describe("guestbook tide physics", () => {
  it("hash32 is stable and sensitive", () => {
    expect(hash32("same")).toBe(hash32("same"));
    expect(hash32("same")).not.toBe(hash32("other"));
  });

  it("layout is deterministic for the same ids", () => {
    const entries = [entry("a"), entry("b"), entry("c")];
    const first = entries.map((item, index) => createBottle(item, index, entries.length, world, 0));
    const second = entries.map((item, index) => createBottle(item, index, entries.length, world, 0));
    expect(first.map((bottle) => [bottle.x, bottle.y, bottle.radius])).toEqual(
      second.map((bottle) => [bottle.x, bottle.y, bottle.radius]),
    );
    expect(new Set(first.map((bottle) => Math.round(bottle.x * 10))).size).toBeGreaterThan(1);
  });

  it("keeps existing positions when a new bottle is appended", () => {
    const first = createBottle(entry("keep"), 0, 1, world, 0);
    first.x = 120;
    first.y = 200;
    const synced = syncBottles([first], [entry("keep"), entry("new")], world, 0);
    expect(synced).toHaveLength(2);
    expect(synced[0]).toMatchObject({ id: "keep", x: 120, y: 200 });
    expect(synced[1].id).toBe("new");
    expect(synced[1].y).toBeGreaterThan(world.height * 0.5);
  });

  it("step stays inside the padded world and separates overlaps", () => {
    const a = createBottle(entry("one"), 0, 2, world, 0);
    const b = createBottle(entry("two"), 1, 2, world, 0);
    a.x = 400;
    a.y = 240;
    b.x = 402;
    b.y = 241;
    let bottles = [a, b];
    for (let i = 0; i < 40; i += 1) bottles = stepBottles(bottles, world, 1 / 30, i / 30);
    for (const bottle of bottles) {
      expect(bottle.x).toBeGreaterThanOrEqual(56);
      expect(bottle.x).toBeLessThanOrEqual(world.width - 56);
      expect(bottle.y).toBeGreaterThanOrEqual(56);
      expect(bottle.y).toBeLessThanOrEqual(world.height - 56);
    }
    const dx = bottles[0].x - bottles[1].x;
    const dy = bottles[0].y - bottles[1].y;
    expect(Math.hypot(dx, dy)).toBeGreaterThan(bottles[0].radius);
  });

  it("hitTest returns the nearer bottle inside radius", () => {
    const bottle = createBottle(entry("target"), 0, 1, world, 0);
    bottle.x = 200;
    bottle.y = 160;
    bottle.radius = 20;
    expect(hitTest([bottle], 200, 160)?.id).toBe("target");
    expect(hitTest([bottle], 280, 160)).toBeNull();
  });

  it("scaleBottles remaps into the new world", () => {
    const bottle = createBottle(entry("scale"), 0, 1, world, 0);
    bottle.x = 400;
    bottle.y = 240;
    const scaled = scaleBottles([bottle], world, { width: 400, height: 240 });
    expect(scaled[0].x).toBeCloseTo(200, 5);
    expect(scaled[0].y).toBeCloseTo(120, 5);
  });

  it("newer bottles are treated as younger", () => {
    expect(bottleAge(new Date(0).toISOString(), 0)).toBe(0);
    expect(bottleAge(new Date(0).toISOString(), 90 * 86_400_000)).toBe(1);
  });
});
