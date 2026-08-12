/**
 * CSP 报告的进程内去重与日志预算（Phase 11B P1）。
 *
 * 明确边界：这是**每个 Serverless/Node 实例内部**的日志抑制机制，
 * 不是 Vercel 平台级/全局限流——多实例之间互不感知，实例回收后状态清零。
 * 平台级限速由 Vercel Firewall 路由规则承担（见 PHASE11-SECURITY-PLAN.md，
 * 属外部授权项，此处不实现）。
 *
 * 设计目标：
 * - 重复报告（同一指纹在 TTL 窗口内）只记录一次，抑制刷屏；
 * - 大量“唯一”报告由滚动窗口日志预算兜底，预算耗尽只停日志、不改响应；
 * - 内存有界：指纹表有容量上限，超限按插入顺序淘汰最旧条目；
 * - 对合法报告永远返回 204（由调用方保证），绝不因预算制造浏览器重试风暴。
 */

export interface CspReportGuardConfig {
  /** 同一指纹在窗口内视为重复（毫秒） */
  dedupTtlMs: number;
  /** 指纹表最大条目数（内存上界） */
  dedupMaxEntries: number;
  /** 日志预算滚动窗口（毫秒） */
  budgetWindowMs: number;
  /** 每窗口最多记录的报告条数 */
  budgetMaxLogs: number;
}

export interface GuardDecision {
  /** 本条报告是否应写日志 */
  log: boolean;
  /** 抑制原因（仅在 log=false 时存在） */
  suppressed?: "duplicate" | "budget";
  /** 新窗口开启时返回上一窗口累计抑制数（含重复与预算），供调用方记一条汇总 */
  windowSummary?: { suppressedInPreviousWindow: number };
}

export interface CspReportGuard {
  decide(fingerprint: string, now?: number): GuardDecision;
  /** 当前指纹表大小（测试内存上界用） */
  size(): number;
}

export function createCspReportGuard(config: CspReportGuardConfig): CspReportGuard {
  /** fingerprint → 过期时间戳；Map 迭代序 = 插入序，用作淘汰顺序 */
  const seen = new Map<string, number>();
  let windowStart = 0;
  let logsInWindow = 0;
  let suppressedInWindow = 0;

  function evict(now: number): void {
    if (seen.size < config.dedupMaxEntries) return;
    // 先清理过期指纹
    for (const [key, expiresAt] of seen) {
      if (expiresAt <= now) seen.delete(key);
    }
    // 仍满则按插入顺序淘汰最旧条目，保证严格内存上界
    while (seen.size >= config.dedupMaxEntries) {
      const oldest = seen.keys().next();
      if (oldest.done) break;
      seen.delete(oldest.value);
    }
  }

  function decide(fingerprint: string, now: number = Date.now()): GuardDecision {
    let windowSummary: GuardDecision["windowSummary"];
    if (now - windowStart >= config.budgetWindowMs) {
      if (suppressedInWindow > 0) {
        windowSummary = { suppressedInPreviousWindow: suppressedInWindow };
      }
      windowStart = now;
      logsInWindow = 0;
      suppressedInWindow = 0;
    }

    const expiresAt = seen.get(fingerprint);
    if (expiresAt !== undefined && expiresAt > now) {
      suppressedInWindow++;
      return { log: false, suppressed: "duplicate", ...(windowSummary ? { windowSummary } : {}) };
    }

    evict(now);
    seen.set(fingerprint, now + config.dedupTtlMs);

    if (logsInWindow >= config.budgetMaxLogs) {
      suppressedInWindow++;
      return { log: false, suppressed: "budget", ...(windowSummary ? { windowSummary } : {}) };
    }

    logsInWindow++;
    return { log: true, ...(windowSummary ? { windowSummary } : {}) };
  }

  return { decide, size: () => seen.size };
}

/* ────────── 生产单例（route.ts 不能导出非 HTTP 符号，单例与重置入口放这里） ────────── */

const PRODUCTION_CONFIG: CspReportGuardConfig = {
  /** 同一指纹 10 分钟内只记录一次 */
  dedupTtlMs: 10 * 60 * 1000,
  /** 指纹表上限：2048 条 × ≈几百字节，内存严格有界 */
  dedupMaxEntries: 2048,
  /** 每实例滚动 5 分钟窗口 */
  budgetWindowMs: 5 * 60 * 1000,
  /** 每窗口最多 60 条报告日志；耗尽后只停日志、不改 204 响应 */
  budgetMaxLogs: 60,
};

let activeGuard = createCspReportGuard(PRODUCTION_CONFIG);

/** route.ts 使用的进程内单例（每 Serverless 实例独立，非全局限流）。 */
export function cspReportGuard(): CspReportGuard {
  return activeGuard;
}

/** 仅供测试：重置单例状态，避免跨用例污染。 */
export function resetCspReportGuardForTests(): void {
  activeGuard = createCspReportGuard(PRODUCTION_CONFIG);
}
