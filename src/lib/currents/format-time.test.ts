import { describe, it, expect } from "vitest";
import { fmtDateTime, fmtHeatChartTime, fmtTime } from "./format-time";

/**
 * SSR 与 hydration 一致性回归：Vercel 构建/渲染环境是 UTC，
 * 桥与主要读者在 UTC+8。若用运行环境本地时区，服务器 HTML 与浏览器
 * hydration 输出不同，触发 hydration mismatch。固定 Asia/Hong_Kong 后，
 * 任何 TZ 下同一 ISO 字符串必须输出同一文本。
 */
const CASES: Array<[string, string]> = [
  ["2026-08-08T13:03:15.043Z", "zh"],
  ["2026-08-08T13:03:15.043Z", "en"],
  ["2026-01-01T16:00:00.000Z", "zh"], // 跨年边界
  ["2026-01-01T16:00:00.000Z", "en"],
];

describe("事件页时间格式固定 Asia/Hong_Kong（SSR/hydration 一致）", () => {
  it.each(CASES)("fmtDateTime %s (%s) 与运行环境时区无关", (iso, locale) => {
    const reference = new Date(iso).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(fmtDateTime(iso, locale)).toBe(reference);
  });

  it.each(CASES)("fmtTime %s (%s) 与运行环境时区无关", (iso, locale) => {
    const reference = new Date(iso).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      timeZone: "Asia/Hong_Kong",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(fmtTime(iso, locale)).toBe(reference);
  });

  it("同一时刻输出等于 HKT 固定值（模拟 SSR vs 浏览器）", () => {
    expect(fmtDateTime("2026-08-08T13:03:15.043Z", "zh")).toBe("2026/8/8 21:03");
  });

  it("曲线标签固定 HKT，并正确跨日", () => {
    const iso = "2026-01-01T16:00:00.000Z";
    const reference = new Date(iso).toLocaleString("zh-CN", {
      timeZone: "Asia/Hong_Kong",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    expect(fmtHeatChartTime(iso, "zh")).toBe(reference);
  });

  it("非法 ISO 原样返回，不抛错", () => {
    expect(fmtDateTime("not-a-date", "zh")).toBe("not-a-date");
    expect(fmtHeatChartTime("not-a-date", "zh")).toBe("not-a-date");
    expect(fmtTime("", "en")).toBe("");
  });
});
