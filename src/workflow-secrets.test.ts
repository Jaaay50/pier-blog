import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as yamlLoad } from "js-yaml";

/**
 * deploy.yml Secret 作用域回归检查（Phase 11B P1）。
 *
 * 威胁模型：GitHub Actions 的 job 级 env 会把 Secret 注入该 job 全部步骤的进程环境，
 * checkout、setup-node、npm ci（及其任意 lifecycle script）都能读到 VERCEL_TOKEN。
 * 收敛后 Secret 只允许出现在实际调用 Vercel CLI 的步骤（pull / build / deploy）的
 * step 级 env 中；此测试防止未来改动把 Secret 提回 job/workflow 级。
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

const VERCEL_SECRETS = ["VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "VERCEL_TOKEN"] as const;

function loadWorkflow(): Workflow {
  const file = path.join(process.cwd(), ".github/workflows/deploy.yml");
  return yamlLoad(readFileSync(file, "utf8")) as Workflow;
}

function referencesSecret(env: Record<string, string> | undefined): boolean {
  if (!env) return false;
  return Object.values(env).some((value) => /secrets\./.test(String(value)));
}

describe("deploy.yml Vercel Secret 作用域", () => {
  const workflow = loadWorkflow();
  const jobs = workflow.jobs ?? {};

  it("workflow 级与 job 级 env 不得引用任何 Secret", () => {
    expect(referencesSecret(workflow.env)).toBe(false);
    for (const [jobName, job] of Object.entries(jobs)) {
      expect(referencesSecret(job.env), `job "${jobName}" 的 env 不得引用 secrets.*`).toBe(false);
    }
  });

  it("只有调用 Vercel CLI 的步骤才注入 Vercel Secret", () => {
    for (const [jobName, job] of Object.entries(jobs)) {
      for (const step of job.steps ?? []) {
        const label = `${jobName} / ${step.name ?? step.uses ?? "unnamed"}`;
        if (!referencesSecret(step.env)) continue;
        // 引用 Secret 的步骤必须是 run 步骤且实际执行 vercel CLI
        expect(step.run, `${label} 注入了 Secret 但不是 run 步骤`).toBeTruthy();
        expect(step.run, `${label} 注入了 Secret 但没有调用 Vercel CLI`).toMatch(
          /node_modules\/\.bin\/vercel/,
        );
      }
    }
  });

  it("deploy job 的 Vercel CLI 步骤具备完整三项 Secret，且非 CLI 步骤零注入", () => {
    const deploy = jobs.deploy;
    expect(deploy).toBeDefined();

    const cliSteps = (deploy?.steps ?? []).filter((step) =>
      /node_modules\/\.bin\/vercel (pull|build|deploy)/.test(step.run ?? ""),
    );
    // pull / build / deploy 三个 CLI 步骤
    expect(cliSteps.length).toBe(3);
    for (const step of cliSteps) {
      for (const secret of VERCEL_SECRETS) {
        expect(step.env?.[secret], `${step.name} 缺少 ${secret}`).toBe(
          `\${{ secrets.${secret} }}`,
        );
      }
    }

    const nonCliSteps = (deploy?.steps ?? []).filter((step) => !cliSteps.includes(step));
    for (const step of nonCliSteps) {
      expect(
        referencesSecret(step.env),
        `非 CLI 步骤 "${step.name ?? step.uses}" 不得注入 Secret`,
      ).toBe(false);
    }
  });
});
