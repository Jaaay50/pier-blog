import { describe, expect, it } from "vitest";
import { coastalTimeForDate, coastalTimeFromHour, getHongKongHour } from "./coastal-time";

describe("coastal time", () => {
  it.each([[4, "night"], [5, "dawn"], [7, "dawn"], [8, "day"], [16, "day"], [17, "dusk"], [18, "dusk"], [19, "night"]] as const)("maps %s", (hour, expected) => {
    expect(coastalTimeFromHour(hour)).toBe(expected);
  });
  it("uses Asia/Hong_Kong rather than the host timezone", () => {
    expect(getHongKongHour(new Date("2026-09-11T00:00:00.000Z"))).toBe(8);
    expect(coastalTimeForDate(new Date("2026-09-11T00:00:00.000Z"))).toBe("day");
  });
});
