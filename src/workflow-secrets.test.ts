import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as yamlLoad } from "js-yaml";

/**
 * deploy.yml Secret 作用域回归检查（Phase 11B P1，复审后收紧）。
 *
 * 威胁模型：
 * 1. workflow/job 级 Secret 会进入全部步骤；npm lifecycle 与构建脚本均可能读取。
 * 2. 同 job 的无凭据步骤仍能写 GITHUB_ENV/GITHUB_PATH，污染后续鉴权进程。
 * 3. 本地 pull/build 会扩大凭据面；部署改为禁 lifecycle 安装后直接上传源码，
 *    由 Vercel 在远端构建，唯一鉴权步骤必须位于 job 末尾。
 * 4. 只检查 env key 不足以防止 run/with 直引或 Secret 错映射。
 *
 * 允许的唯一集合：
 * - remote deploy -> VERCEL_TOKEN + VERCEL_ORG_ID + VERCEL_PROJECT_ID
 * - 其余任何步骤 -> 零 Secret
 */

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
  [key: string]: unknown;
}

interface WorkflowJob {
  env?: Record<string, string>;
  steps?: WorkflowStep[];
  [key: string]: unknown;
}

interface Workflow {
  env?: Record<string, string>;
  jobs?: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

interface StepSecretRule {
  expectedName: string;
  exactRun: string;
  expectedEnv: Record<string, string>;
}

const APPROVED_WORKFLOW_ENV = { NPM_VERSION: "10.9.8" };
const CHECKOUT_ACTION = "actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8";
const SETUP_NODE_ACTION = "actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444";
const INSTALL_RUN = "npm ci --ignore-scripts";
const VERIFY_TOOLCHAIN_RUN = `
test "$(node --version)" = "v$(cat .nvmrc)"
test "$(cat .node-version)" = "$(cat .nvmrc)"
test "$(npm --version)" = "\${NPM_VERSION}"
`.trim();
const VERIFY_VERCEL_CLI_RUN = `
declared_version="$(node -p 'require("./package.json").devDependencies?.vercel || ""')"
resolved_version="$(node -p 'require("./node_modules/vercel/package.json").version')"
if [[ -z "\${declared_version}" || "\${declared_version}" != "\${resolved_version}" ]]; then
  echo "Vercel CLI must be an exact devDependency matching the lockfile." >&2
  exit 1
fi
test -x ./node_modules/.bin/vercel
`.trim();
const VERCEL_DEPLOY_RUN = './node_modules/.bin/vercel deploy --yes --prod --archive=tgz --token="${VERCEL_TOKEN}"';

const STEP_SECRET_RULES: StepSecretRule[] = [
  {
    expectedName: "Deploy source through Vercel remote build",
    exactRun: VERCEL_DEPLOY_RUN,
    expectedEnv: {
      VERCEL_ORG_ID: "${{ secrets.VERCEL_ORG_ID }}",
      VERCEL_PROJECT_ID: "${{ secrets.VERCEL_PROJECT_ID }}",
      VERCEL_TOKEN: "${{ secrets.VERCEL_TOKEN }}",
    },
  },
];

function loadWorkflow(): Workflow {
  const file = path.join(process.cwd(), ".github/workflows/deploy.yml");
  return yamlLoad(readFileSync(file, "utf8")) as Workflow;
}

function stringFields(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringFields);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => [key, ...stringFields(nested)]);
}

/** Find Secret names in any parsed YAML field, including env, run and with. */
function secretReferences(value: unknown): string[] {
  const refs: string[] = [];
  for (const field of stringFields(value)) {
    for (const match of field.matchAll(/\bsecrets\s*(?:\.\s*([A-Za-z_][A-Za-z0-9_]*)|\[\s*(?:(["'])([^"']+)\2|([^\]]+))\s*\])/gi)) {
      refs.push(match[1] ?? match[3]?.trim() ?? "<dynamic>");
    }
  }
  return [...new Set(refs)].sort();
}

function withoutKey<T extends Record<string, unknown>>(value: T, key: string): Record<string, unknown> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function normalizeStepRun(step: WorkflowStep): WorkflowStep {
  return step.run === undefined ? step : { ...step, run: step.run.trim() };
}

function validateStepSecretPolicy(step: WorkflowStep): string[] {
  const errors: string[] = [];
  const run = step.run ?? "";
  const rule = STEP_SECRET_RULES.find(({ exactRun }) => exactRun === run);
  const allRefs = secretReferences(step);
  const nonEnvRefs = secretReferences(withoutKey(step, "env"));

  if (!rule) {
    if (allRefs.length > 0) errors.push(`non-auth step references Secret: ${allRefs.join(", ")}`);
  } else {
    const actualEnv = step.env ?? {};
    const actualStepKeys = Object.keys(step).sort();
    const expectedKeys = Object.keys(rule.expectedEnv).sort();
    const actualKeys = Object.keys(actualEnv).sort();
    if (JSON.stringify(actualStepKeys) !== JSON.stringify(["env", "name", "run"])) {
      errors.push(`auth step fields must be exactly env, name and run: ${actualStepKeys.join(", ")}`);
    }
    if (step.name !== rule.expectedName) errors.push("auth step name must match the approved remote deploy step");
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      errors.push(`unexpected env keys: ${actualKeys.join(", ")}`);
    }
    for (const [key, expectedValue] of Object.entries(rule.expectedEnv)) {
      if (actualEnv[key] !== expectedValue) errors.push(`${key} must map to its same-named Secret`);
    }
    if (nonEnvRefs.length > 0) {
      errors.push(`auth step references Secret outside env: ${nonEnvRefs.join(", ")}`);
    }
  }

  if (/(?:^|\n)\s*\.\/node_modules\/\.bin\/vercel(?:\s|$)/.test(run) && !rule) {
    errors.push("only the approved remote deploy command may execute Vercel CLI");
  }

  return errors;
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

  it("workflow 与 job 的非步骤字段不得引用任何 Secret", () => {
    expect(secretReferences(withoutKey(workflow, "jobs"))).toEqual([]);
    expect(workflow.env, "workflow 继承环境只允许固定 npm 版本").toEqual(APPROVED_WORKFLOW_ENV);
    expect(workflow.defaults, "workflow 不得覆盖鉴权步骤的默认 shell").toBeUndefined();
    for (const [jobName, job] of Object.entries(jobs)) {
      expect(secretReferences(withoutKey(job, "steps")), `job "${jobName}" 不得在步骤外引用 Secret`).toEqual([]);
      expect(job.env, `job "${jobName}" 不得向步骤注入继承环境`).toBeUndefined();
      expect(job.defaults, `job "${jobName}" 不得覆盖鉴权步骤的默认 shell`).toBeUndefined();
      expect(job.container, `job "${jobName}" 不得通过 container 注入执行环境`).toBeUndefined();
    }
  });

  it("每个步骤都符合完整字段 Secret 白名单和精确映射", () => {
    for (const { label, step } of allSteps) {
      expect(validateStepSecretPolicy(step), label).toEqual([]);
    }
  });

  it("唯一鉴权步骤是 job 末尾的 Vercel 远端构建部署", () => {
    for (const rule of STEP_SECRET_RULES) {
      expect(allSteps.filter(({ step }) => step.run === rule.exactRun).length).toBe(1);
    }
    expect(allSteps.filter(({ step }) => secretReferences(step).length > 0).length).toBe(1);
    expect(jobs.deploy?.steps?.at(-1)?.run).toBe(VERCEL_DEPLOY_RUN);
  });

  it("deploy job 鉴权前只执行锁定的可信准备链", () => {
    expect(jobs.deploy?.steps?.slice(0, -1).map(normalizeStepRun)).toEqual([
      {
        name: "Checkout",
        uses: CHECKOUT_ACTION,
        with: {
          ref: "${{ needs.authorize.outputs.deploy_sha }}",
          "persist-credentials": false,
        },
      },
      {
        name: "Setup Node.js",
        uses: SETUP_NODE_ACTION,
        with: {
          "node-version-file": ".nvmrc",
          cache: "npm",
        },
      },
      {
        name: "Verify toolchain",
        run: VERIFY_TOOLCHAIN_RUN,
      },
      {
        name: "Install locked dependencies without lifecycle scripts",
        run: INSTALL_RUN,
      },
      {
        name: "Verify pinned local Vercel CLI",
        run: VERIFY_VERCEL_CLI_RUN,
      },
    ]);
    expect(allSteps.some(({ step }) => /node_modules\/\.bin\/vercel\s+(?:pull|build)\b/.test(step.run ?? ""))).toBe(false);
    expect(allSteps.some(({ step }) => /--prebuilt(?:=|\s|$)/.test(step.run ?? ""))).toBe(false);
  });
});

describe("Secret 策略 helper 回归", () => {
  it("能发现 run 与 with 中的直接 Secret 引用", () => {
    expect(secretReferences({ run: "echo ${{ secrets.RUN_TOKEN }}" })).toEqual(["RUN_TOKEN"]);
    expect(secretReferences({ with: { token: "${{ secrets.WITH_TOKEN }}" } })).toEqual(["WITH_TOKEN"]);
    expect(secretReferences({ run: "echo ${{ secrets['BRACKET_TOKEN'] }}" })).toEqual(["BRACKET_TOKEN"]);
    expect(secretReferences({ run: 'echo ${{ secrets["DOUBLE_QUOTED_TOKEN"] }}' })).toEqual(["DOUBLE_QUOTED_TOKEN"]);
    expect(secretReferences({ run: "echo ${{ secrets . SPACED_TOKEN }}" })).toEqual(["SPACED_TOKEN"]);
    expect(secretReferences({ with: { token: "${{ secrets[matrix.secret_name] }}" } })).toEqual(["<dynamic>"]);
    expect(validateStepSecretPolicy({ run: "echo ${{ secrets.RUN_TOKEN }}" })).not.toEqual([]);
    expect(validateStepSecretPolicy({ uses: "example/action@sha", with: { token: "${{ secrets.WITH_TOKEN }}" } })).not.toEqual([]);
  });

  it("拒绝 Secret 错映射和鉴权步骤 env 外引用", () => {
    expect(validateStepSecretPolicy({
      name: "Deploy source through Vercel remote build",
      run: VERCEL_DEPLOY_RUN,
      env: {
        VERCEL_ORG_ID: "${{ secrets.VERCEL_PROJECT_ID }}",
        VERCEL_PROJECT_ID: "${{ secrets.VERCEL_ORG_ID }}",
        VERCEL_TOKEN: "${{ secrets.OTHER_TOKEN }}",
      },
    })).not.toEqual([]);
    expect(validateStepSecretPolicy({
      name: "Deploy source through Vercel remote build",
      run: VERCEL_DEPLOY_RUN + " # ${{ secrets.EXTRA_TOKEN }}",
      env: {
        VERCEL_ORG_ID: "${{ secrets.VERCEL_ORG_ID }}",
        VERCEL_PROJECT_ID: "${{ secrets.VERCEL_PROJECT_ID }}",
        VERCEL_TOKEN: "${{ secrets.VERCEL_TOKEN }}",
      },
    })).not.toEqual([]);
  });

  it("拒绝在鉴权步骤追加构建或持久化环境变量", () => {
    const approvedEnv = {
      VERCEL_ORG_ID: "${{ secrets.VERCEL_ORG_ID }}",
      VERCEL_PROJECT_ID: "${{ secrets.VERCEL_PROJECT_ID }}",
      VERCEL_TOKEN: "${{ secrets.VERCEL_TOKEN }}",
    };
    expect(validateStepSecretPolicy({
      name: "Deploy source through Vercel remote build",
      run: `${VERCEL_DEPLOY_RUN}\nnpm run build`,
      env: approvedEnv,
    })).not.toEqual([]);
    expect(validateStepSecretPolicy({
      name: "Deploy source through Vercel remote build",
      run: `${VERCEL_DEPLOY_RUN}\necho VERCEL_TOKEN=$VERCEL_TOKEN >> $GITHUB_ENV`,
      env: approvedEnv,
    })).not.toEqual([]);
    expect(validateStepSecretPolicy({
      name: "Deploy source through Vercel remote build",
      run: VERCEL_DEPLOY_RUN,
      env: approvedEnv,
      shell: "./scripts/capture-secret.sh {0}",
    })).not.toEqual([]);
    expect(validateStepSecretPolicy({
      run: "./node_modules/.bin/vercel build --prod",
    })).not.toEqual([]);
  });
});
