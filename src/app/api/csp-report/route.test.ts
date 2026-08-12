import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { resetCspReportGuardForTests } from "./report-guard";

function postReport(
  payload: unknown,
  contentType = "application/csp-report",
  headers?: Record<string, string>,
) {
  return POST(
    new Request("https://ethanpier.com/api/csp-report", {
      method: "POST",
      headers: { "Content-Type": contentType, ...headers },
      body: JSON.stringify(payload),
    }),
  );
}

beforeEach(() => {
  resetCspReportGuardForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/csp-report", () => {
  it("接收旧版 CSP 报告，并在记录前剔除查询、锚点和脚本样本", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await postReport({
      "csp-report": {
        "document-uri": "https://ethanpier.com/zh/blog/post?token=SECRET#private",
        "blocked-uri": "https://cdn.example/script.js?key=SECRET",
        "effective-directive": "script-src-elem",
        "source-file": "https://ethanpier.com/_next/app.js?build=SECRET",
        "line-number": 12,
        "column-number": 8,
        "status-code": 200,
        "script-sample": "SECRET_INLINE_SOURCE",
        disposition: "report",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(info).toHaveBeenCalledOnce();

    const logged = String(info.mock.calls[0][1]);
    expect(logged).toContain("https://ethanpier.com/zh/blog/post");
    expect(logged).toContain("https://cdn.example/script.js");
    expect(logged).toContain('"directive":"script-src-elem"');
    expect(logged).not.toContain("SECRET");
    expect(logged).not.toContain("script-sample");
  });

  it("接收 Reporting API 的 CSP 报告数组", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await postReport(
      [
        {
          type: "csp-violation",
          body: {
            documentURL: "https://ethanpier.com/en",
            blockedURL: "inline",
            effectiveDirective: "script-src-attr",
            disposition: "report",
          },
        },
      ],
      "application/reports+json; charset=utf-8",
    );

    expect(response.status).toBe(204);
    expect(info).toHaveBeenCalledOnce();
    expect(String(info.mock.calls[0][1])).toContain('"blockedUrl":"inline"');
  });

  it.each([
    ["unsupported media type", { value: true }, "application/json", undefined, 415],
    ["cross-site browser request", { value: true }, "application/csp-report", { "Sec-Fetch-Site": "cross-site" }, 403],
    ["invalid report shape", { value: true }, "application/csp-report", undefined, 400],
    [
      "cross-origin document URL",
      { "csp-report": { "document-uri": "https://evil.example/path", "effective-directive": "script-src" } },
      "application/csp-report",
      undefined,
      400,
    ],
  ])("拒绝 %s", async (_name, payload, contentType, headers, status) => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await postReport(payload, contentType, headers);

    expect(response.status).toBe(status);
    expect(info).not.toHaveBeenCalled();
  });

  it("拒绝超过 16 KiB 的请求体", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await POST(
      new Request("https://ethanpier.com/api/csp-report", {
        method: "POST",
        headers: { "Content-Type": "application/csp-report" },
        body: "x".repeat(17 * 1024),
      }),
    );

    expect(response.status).toBe(413);
    expect(info).not.toHaveBeenCalled();
  });

  it("每次 Reporting API 请求最多接收 10 条报告", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const entry = {
      type: "csp-violation",
      body: {
        documentURL: "https://ethanpier.com/en",
        effectiveDirective: "script-src-elem",
      },
    };
    const response = await postReport(Array.from({ length: 11 }, () => entry), "application/reports+json");

    expect(response.status).toBe(400);
    expect(info).not.toHaveBeenCalled();
  });
});

describe("POST /api/csp-report 日志护栏（每实例去重与预算，非平台级限流）", () => {
  function report(path: string, directive = "script-src-elem") {
    return {
      "csp-report": {
        "document-uri": `https://ethanpier.com${path}`,
        "effective-directive": directive,
        "blocked-uri": "https://cdn.example/x.js",
      },
    };
  }

  it("同一指纹重复提交：日志只记一次，响应仍全部 204", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    for (let i = 0; i < 5; i++) {
      const res = await postReport(report("/zh/blog/dup"));
      expect(res.status).toBe(204);
    }
    // 五次重复只产生一条报告日志
    expect(info).toHaveBeenCalledOnce();
  });

  it("不同指纹互不影响；去重后日志不含被抑制条目", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await postReport(report("/zh/page-a"));
    await postReport(report("/zh/page-a")); // duplicate，不记日志
    await postReport(report("/zh/page-b")); // 新指纹，记日志

    expect(info).toHaveBeenCalledTimes(2);
    const secondLog = String(info.mock.calls[1][1]);
    expect(secondLog).toContain("/zh/page-b");
    expect(secondLog).not.toContain("/zh/page-a");
  });

  it("大量唯一报告耗尽每实例预算后：停止记日志但持续返回 204，不触发浏览器重试", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    // 预算 60 条/窗口；提交 70 条各不相同的报告
    for (let i = 0; i < 70; i++) {
      const res = await postReport(report(`/zh/unique-${i}`));
      expect(res.status).toBe(204); // 预算耗尽也绝不改变响应状态
    }
    expect(info).toHaveBeenCalledTimes(60);
  });
});
