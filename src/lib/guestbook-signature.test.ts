import { describe, expect, it } from "vitest";
import { parseGuestbookSignature } from "./guestbook-signature";

describe("parseGuestbookSignature", () => {
  it("空白视为不署名", () => {
    expect(parseGuestbookSignature(undefined)).toEqual({ ok: true, value: null });
    expect(parseGuestbookSignature("")).toEqual({ ok: true, value: null });
    expect(parseGuestbookSignature("   ")).toEqual({ ok: true, value: null });
  });

  it("压缩空白并拒绝站主名、URL、邮箱、超长", () => {
    expect(parseGuestbookSignature("  林林  ")).toEqual({ ok: true, value: "林林" });
    expect(parseGuestbookSignature("Jonathan").ok).toBe(true);
    expect(parseGuestbookSignature("Pier").ok).toBe(false);
    expect(parseGuestbookSignature("  Ethan   Pier  ").ok).toBe(false);
    expect(parseGuestbookSignature("foo.com").ok).toBe(false);
    expect(parseGuestbookSignature("alice@example.com").ok).toBe(false);
    expect(parseGuestbookSignature("字".repeat(25)).ok).toBe(false);
  });
});
