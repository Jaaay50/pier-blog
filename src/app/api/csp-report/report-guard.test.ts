import { describe, expect, it } from "vitest";
import { createCspReportGuard } from "./report-guard";

const BASE = 1_700_000_000_000;

function makeGuard(overrides?: Partial<Parameters<typeof createCspReportGuard>[0]>) {
  return createCspReportGuard({
    dedupTtlMs: 10 * 60 * 1000,
    dedupMaxEntries: 8,
    budgetWindowMs: 5 * 60 * 1000,
    budgetMaxLogs: 3,
    ...overrides,
  });
}

describe("createCspReportGuard：TTL 指纹去重", () => {
  it("同一指纹在 TTL 窗口内只记录一次，其余标记 duplicate", () => {
    const guard = makeGuard();
    expect(guard.decide("fp-a", BASE).log).toBe(true);
    const second = guard.decide("fp-a", BASE + 1000);
    expect(second.log).toBe(false);
    expect(second.suppressed).toBe("duplicate");
    // 不同指纹互不影响
    expect(guard.decide("fp-b", BASE + 1000).log).toBe(true);
  });

  it("TTL 过期后同一指纹恢复记录", () => {
    const guard = makeGuard({ dedupTtlMs: 60_000, budgetWindowMs: 3_600_000 });
    expect(guard.decide("fp-a", BASE).log).toBe(true);
    expect(guard.decide("fp-a", BASE + 59_999).log).toBe(false);
    expect(guard.decide("fp-a", BASE + 60_001).log).toBe(true);
  });
});

describe("createCspReportGuard：日志预算", () => {
  it("窗口内超出预算的唯一报告被抑制（budget），窗口滚动后恢复", () => {
    const guard = makeGuard();
    // 预算 3：前 3 条唯一指纹记录，第 4 条起抑制
    for (let i = 0; i < 3; i++) {
      expect(guard.decide(`fp-${i}`, BASE).log).toBe(true);
    }
    const fourth = guard.decide("fp-3", BASE);
    expect(fourth.log).toBe(false);
    expect(fourth.suppressed).toBe("budget");

    // 新窗口：预算重置，且带上一窗口抑制汇总
    const next = guard.decide("fp-4", BASE + 5 * 60 * 1000);
    expect(next.log).toBe(true);
    expect(next.windowSummary).toEqual({ suppressedInPreviousWindow: 1 });
  });

  it("重复与预算抑制都计入窗口汇总；无抑制的窗口不产生汇总", () => {
    const guard = makeGuard();
    guard.decide("fp-a", BASE);
    guard.decide("fp-a", BASE + 1); // duplicate
    guard.decide("fp-b", BASE);
    guard.decide("fp-c", BASE);
    guard.decide("fp-d", BASE); // budget（预算 3 已用完）

    const next = guard.decide("fp-e", BASE + 5 * 60 * 1000);
    expect(next.windowSummary).toEqual({ suppressedInPreviousWindow: 2 });

    // 该窗口无任何抑制 → 下个窗口不带汇总
    const clean = guard.decide("fp-f", BASE + 10 * 60 * 1000);
    expect(clean.windowSummary).toBeUndefined();
  });
});

describe("createCspReportGuard：内存上界", () => {
  it("指纹表不超过 dedupMaxEntries，超限按插入顺序淘汰最旧", () => {
    const guard = makeGuard({ dedupMaxEntries: 4, budgetMaxLogs: 1000 });
    for (let i = 0; i < 100; i++) {
      guard.decide(`fp-${i}`, BASE + i);
    }
    expect(guard.size()).toBeLessThanOrEqual(4);
    // 最旧的 fp-96 已被淘汰 → 重新出现时视为新指纹（可记录）
    expect(guard.decide("fp-0", BASE + 200).log).toBe(true);
    // 最新的 fp-99 仍在表内 → duplicate
    expect(guard.decide("fp-99", BASE + 200).log).toBe(false);
  });

  it("淘汰优先清理已过期指纹", () => {
    const guard = makeGuard({ dedupMaxEntries: 3, dedupTtlMs: 1000, budgetMaxLogs: 1000 });
    guard.decide("fp-old", BASE);
    // fp-old 已过期；插入两条新鲜指纹填满
    guard.decide("fp-a", BASE + 2000);
    guard.decide("fp-b", BASE + 2000);
    // 第 4 条触发淘汰：先清过期的 fp-old，新鲜的 fp-a/fp-b 保留
    guard.decide("fp-c", BASE + 2001);
    expect(guard.decide("fp-a", BASE + 2002).log).toBe(false);
    expect(guard.decide("fp-b", BASE + 2002).log).toBe(false);
  });
});
