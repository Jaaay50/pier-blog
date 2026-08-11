import { describe, expect, it } from "vitest";
import { sanitizeFeedbackPagePath } from "./api";
import { siteFeedbackSubmittedKey } from "./feedback-state";

describe("sanitizeFeedbackPagePath", () => {
  it("保留合法站内路径", () => {
    expect(sanitizeFeedbackPagePath("/zh/feedback")).toBe("/zh/feedback");
    expect(sanitizeFeedbackPagePath("/en/currents/agent")).toBe("/en/currents/agent");
  });

  it("剥掉 query 与 hash", () => {
    expect(sanitizeFeedbackPagePath("/zh/feedback?category=agent_access")).toBe("/zh/feedback");
    expect(sanitizeFeedbackPagePath("/zh/currents#top")).toBe("/zh/currents");
  });

  it("绝对 URL 只保留路径，丢弃 query/hash/凭据", () => {
    expect(
      sanitizeFeedbackPagePath("https://ethanpier.com/zh/currents?token=abc#frag"),
    ).toBe("/zh/currents");
  });

  it("拒绝非站内形式与可疑字符", () => {
    expect(sanitizeFeedbackPagePath("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeFeedbackPagePath("\\\\evil\\path")).toBeUndefined();
    expect(sanitizeFeedbackPagePath("not-a-path")).toBeUndefined();
    expect(sanitizeFeedbackPagePath("/has space")).toBeUndefined();
    expect(sanitizeFeedbackPagePath("")).toBeUndefined();
    expect(sanitizeFeedbackPagePath(undefined)).toBeUndefined();
    expect(sanitizeFeedbackPagePath(null)).toBeUndefined();
  });

  it("截断超长路径", () => {
    const long = `/${"a".repeat(300)}`;
    expect(sanitizeFeedbackPagePath(long)).toHaveLength(200);
  });
});

describe("siteFeedbackSubmittedKey", () => {
  it("生成 site 作用域的防重复 key", () => {
    expect(siteFeedbackSubmittedKey("agent_access")).toBe("site:site:agent_access");
  });
});
