import { describe, expect, it } from "vitest";
import {
  glyphBelongsToTitle,
  hasUnexpectedLatin,
  sampleSourceAllowed,
} from "./particle-sample";

const ZH = "全栈的栈，也是栈桥的栈";
const EN = "A pier has to hold at both ends";

describe("particle sample contract", () => {
  it("accepts the current Chinese title and rejects a leftover Latin T", () => {
    expect(sampleSourceAllowed(ZH, ZH)).toBe(true);
    expect(sampleSourceAllowed(ZH, `${ZH}T`)).toBe(false);
    expect(hasUnexpectedLatin(ZH, `${ZH}T`)).toBe(true);
    expect(glyphBelongsToTitle(ZH, "T")).toBe(false);
    expect(glyphBelongsToTitle(ZH, "栈")).toBe(true);
  });

  it("allows Latin that actually belongs to the English title", () => {
    expect(sampleSourceAllowed(EN, EN)).toBe(true);
    expect(hasUnexpectedLatin(EN, EN)).toBe(false);
    expect(glyphBelongsToTitle(EN, "T")).toBe(false);
    expect(glyphBelongsToTitle(EN, "t")).toBe(true);
  });

  it("treats word-spacing as part of the English title, not as foreign ink", () => {
    expect(glyphBelongsToTitle(EN, " ")).toBe(true);
    expect(glyphBelongsToTitle(EN, "\u00a0")).toBe(true);
    expect(sampleSourceAllowed(EN, "A pier has to hold at both ends")).toBe(true);
  });
});
