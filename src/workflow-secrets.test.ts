import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as yamlLoad } from "js-yaml";

/**
 * deploy.yml Secret 作用域回归检查（Phase 11B P1，复审后收紧）。
 *
 * 威胁模型：
 * 1. GitHub Actions 的 workflow/job 级 env 会把 Secret 注入全部步骤的进程环境，
 *    checkout、setup-node、npm ci（及其任意 lifecycle script）都能读到 VERCEL_TOKEN。
 * 2. `vercel build` 会执行项目构建（next build 与任意依赖脚本）。构建步骤持有
 *    Secret 意味着供应链恶意脚本可以直接窃取部署凭据——build 必须零 Secret、
 *    零 --token 参数，完全依赖前一步 `vercel pull` 写入的本地 .vercel/ 项目配置。
 *
 * 允许的最小集合（唯一真源，收窄或保持才能通过）：
 * - pull   → VERCEL_TOKEN + VERCEL_ORG_ID + VERCEL_PROJECT_ID（无本地 .vercel/ 时定位项目）
 * - deploy → VERCEL_TOKEN（org/project 读取 pull 产物 .vercel/project.json）
 * - 其余任何步骤 → 零 Secret
 */

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  env?: Record<string, string>;
}

interface WorkflowJob {
  env?: Record<string, string>;
  steps?: WorkflowStep[];
}

interface Workflow {
  env?: Record<string, string>;
  jobs?: Record<string, WorkflowJob>;
}

function loadWorkflow(): Workflow {
  const file = path.join(process.cwd(), ".github/workflows/deploy.yml");
  return yamlLoad(readFileSync(file, "utf8")) as Workflow;
}

function referencesSecret(env: Record<string, string> | undefined): boolean {
  if (!env) return false;
  return Object.values(env).some((value) => /secrets\./.test(String(value)));
}

/** step 允许持有的 Secret 白名单（按 run 命令匹配）；未匹配的步骤一律零 Secret。 */
const STEP_SECRET_ALLOWLIST: Array<{ match: RegExp; allowed: string[] }> = [
  {
    match: /node_modules\/\.bin\/vercel pull /,
    allowed: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
  },
  {
    match: /node_modules\/\.bin\/vercel deploy /,
    allowed: ["VERCEL_TOKEN"],
  },
];

function secretEnvKeys(env: Record<string, string> | undefined): string[] {
  if (!env) return [];
  return Object.entries(env)
    .filter(([, value]) => /secrets\./.test(String(value)))
    .map(([key]) => key);
}

describe("deploy.yml Vercel Secret 作用域", () => {
  const workflow = loadWorkflow();
  const jobs = workflow.jobs ?? {};
  const allSteps: Array<{ label: string; step: WorkflowStep }> = Object.entries(jobs).flatMap(
    ([jobName, job]) =>
      (job.steps ?? []).map((step) => ({
        label: `${jobName} / ${step.name ?? step.uses ?? "unnamed"}`,
        step,
      })),
  );

  it("workflow 级与 job 级 env 不得引用任何 Secret", () => {
    expect(referencesSecret(workflow.env)).toBe(false);
    for (const [jobName, job] of Object.entries(jobs)) {
      expect(referencesSecret(job.env), `job "${jobName}" 的 env 不得引用 secrets.*`).toBe(false);
    }
  });

  it("vercel build 步骤必须零 Secret 且不携带 --token", () => {
    const buildSteps = allSteps.filter(({ step }) =>
      /node_modules\/\.bin\/vercel build/.test(step.run ?? ""),
    );
    expect(buildSteps.length, "deploy.yml 必须存在 vercel build 步骤").toBeGreaterThan(0);
    for (const { label, step } of buildSteps) {
      expect(referencesSecret(step.env), `${label} 不得注入任何 Secret`).toBe(false);
      expect(step.run, `${label} 不得携带 --token`).not.toMatch(/--token/);
      expect(step.env ?? {}, `${label} 不得设置 VERCEL_* 凭据环境变量`).not.toHaveProperty(
        "VERCEL_TOKEN",
      );
    }
  });

  it("每个步骤的 Secret 集合不得超出该步骤所需的最小白名单", () => {
    for (const { label, step } of allSteps) {
      const keys = secretEnvKeys(step.env);
      if (keys.length === 0) continue;

      const rule = STEP_SECRET_ALLOWLIST.find(({ match }) => match.test(step.run ?? ""));
      expect(rule, `${label} 持有 Secret（${keys.join(", ")}）但不在允许鉴权的步骤白名单内`).toBeDefined();
      for (const key of keys) {
        expect(rule!.allowed, `${label} 持有超出最小集合的 Secret: ${key}`).toContain(key);
      }
    }
  });

  it("pull 与 deploy 各自持有且仅持有其最小 Secret 集合", () => {
    const pull = allSteps.find(({ step }) => /node_modules\/\.bin\/vercel pull /.test(step.run ?? ""));
    const deploy = allSteps.find(({ step }) =>
      /node_modules\/\.bin\/vercel deploy /.test(step.run ?? ""),
    );
    expect(pull, "缺少 vercel pull 步骤").toBeDefined();
    expect(deploy, "缺少 vercel deploy 步骤").toBeDefined();

    expect(secretEnvKeys(pull!.step.env).sort()).toEqual([
      "VERCEL_ORG_ID",
      "VERCEL_PROJECT_ID",
      "VERCEL_TOKEN",
    ]);
    expect(secretEnvKeys(deploy!.step.env)).toEqual(["VERCEL_TOKEN"]);
  });

  it("非 Vercel 鉴权步骤（checkout/setup-node/npm ci/构建等）零 Secret", () => {
    const authRuns = /node_modules\/\.bin\/vercel (pull|deploy) /;
    for (const { label, step } of allSteps) {
      if (authRuns.test(step.run ?? "")) continue;
      expect(referencesSecret(step.env), `${label} 不得引用 secrets.*`).toBe(false);
    }
  });
});
