import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Metadata } from "next";
import { locales } from "@/i18n/config";
import { TransitionLink } from "@/components/TransitionLink";
import { AgentCopyBlock, AgentCopyChip } from "@/components/currents/AgentCopyBlock";
import { AgentToc } from "@/components/currents/AgentToc";

const SITE_URL = "https://ethanpier.com";
const MCP_ENDPOINT = "https://currents-mcp.ethanpier.com/mcp";
const CONTACT_EMAIL = "ethan_pier@icloud.com";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "agent" });

  return {
    title: `${t("title")} — Pier`,
    description: t("subtitle"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/currents/agent`,
      languages: {
        en: `${SITE_URL}/en/currents/agent`,
        zh: `${SITE_URL}/zh/currents/agent`,
        "x-default": `${SITE_URL}/en/currents/agent`,
      },
    },
  };
}

function Section({
  id,
  stage,
  title,
  children,
}: {
  id: string;
  /** 四阶段 eyebrow（理解接入 / 配置 / 安装与验证 / 排障与申请） */
  stage?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-16 scroll-mt-24">
      {stage && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--accent)]">
          {stage}
        </p>
      )}
      <h2 className="font-display mb-5 text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function CodeBlock({
  children,
  label,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
}: {
  children: string;
  label?: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
}) {
  return (
    <AgentCopyBlock
      text={children}
      label={label}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
      copyFailedLabel={copyFailedLabel}
    >
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-[var(--text-primary)]">
        <code className="font-[family-name:var(--font-jetbrains-mono)]">{children}</code>
      </pre>
    </AgentCopyBlock>
  );
}

/**
 * Agent 接入页（阶段 C）：把 MCP（工具层）与 Skill（语义层）表达为同一项
 * 「潮汐 Agent 接入」能力。受邀开放、只读、中英双语；所有配置示例仅使用占位符。
 */
export default async function CurrentsAgentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("agent");

  const tools = [
    { name: t("toolHotName"), desc: t("toolHotDesc") },
    { name: t("toolSearchName"), desc: t("toolSearchDesc") },
    { name: t("toolItemName"), desc: t("toolItemDesc") },
    { name: t("toolEventName"), desc: t("toolEventDesc") },
    { name: t("toolDailyName"), desc: t("toolDailyDesc") },
  ];
  const examples = [t("example1"), t("example2"), t("example3"), t("example4")];
  const trouble = [
    { title: t("trouble1Title"), desc: t("trouble1Desc") },
    { title: t("trouble2Title"), desc: t("trouble2Desc") },
    { title: t("trouble3Title"), desc: t("trouble3Desc") },
    { title: t("trouble4Title"), desc: t("trouble4Desc") },
  ];

  const codexConfig = `# ~/.codex/config.toml
[mcp_servers.currents]
url = "${MCP_ENDPOINT}"
http_headers = { "Authorization" = "Bearer TOKEN" }`;

  const claudeCommand = `claude mcp add --transport http currents \\
  ${MCP_ENDPOINT} \\
  --header "Authorization: Bearer TOKEN"`;

  const genericConfig = `{
  "mcpServers": {
    "currents": {
      "type": "http",
      "url": "${MCP_ENDPOINT}",
      "headers": {
        "Authorization": "Bearer TOKEN"
      }
    }
  }
}`;

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    locale === "zh" ? "潮汐 Agent 接入申请" : "Currents Agent Access Request",
  )}`;
  const feedbackPath = "/feedback?category=agent_access";

  const tocItems = [
    { id: "understand", label: t("stage1Label") },
    { id: "configure", label: t("stage2Label") },
    { id: "install-verify", label: t("stage3Label") },
    { id: "troubleshoot-apply", label: t("stage4Label") },
  ];
  const quickLinks = [
    { href: mailtoHref, label: t("inviteAction"), external: true },
    { href: feedbackPath, label: t("feedbackCtaAction") },
  ];

  return (
    <div className="pb-8 xl:grid xl:grid-cols-[minmax(0,52rem)_15rem] xl:gap-14 2xl:grid-cols-[minmax(0,54rem)_16rem]">
      <article className="min-w-0">
      <header className="pb-2">
        <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {t("heading")}
        </h1>
        <p className="max-w-2xl leading-relaxed text-[var(--text-secondary)]">
          {t("subtitle")}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="status">
          {[t("statusInvite"), t("statusReadonly"), t("statusBilingual")].map((s) => (
            <li
              key={s}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] font-medium text-[var(--text-secondary)]"
            >
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={mailtoHref}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("inviteAction")}
          </a>
          <a
            href="#configure"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("heroSecondaryAction")}
          </a>
        </div>
      </header>

      {/* 窄屏紧凑目录：正文顶部横滚；xl 起转为右侧粘性栏 */}
      <div className="mt-8 border-y border-[var(--border)] py-2.5 xl:hidden">
        <AgentToc title={t("tocLabel")} items={tocItems} />
      </div>

      <Section id="understand" stage={t("stage1Label")} title={t("layersTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">
              {t("layerMcpTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t("layerMcpDesc")}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">
              {t("layerSkillTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t("layerSkillDesc")}
            </p>
          </div>
        </div>
      </Section>

      <Section id="examples" title={t("examplesTitle")}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {examples.map((ex) => (
            <li key={ex}>
              <AgentCopyChip
                text={ex}
                copyLabel={t("copyLabel")}
                copiedLabel={t("copiedLabel")}
                copyFailedLabel={t("copyFailedLabel")}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tools" title={t("toolsTitle")}>
        <dl className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {tools.map((tool) => (
            <div key={tool.name} className="px-4 py-3.5 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
              <dt className="font-[family-name:var(--font-jetbrains-mono)] text-[13px] font-medium text-[var(--accent)]">
                {tool.name}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)] sm:mt-0">
                {tool.desc}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="configure" stage={t("stage2Label")} title={t("mcpTitle")}>
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {t("mcpIntro")}
        </p>
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">
              {t("mcpCodexTitle")}
            </h3>
            <CodeBlock label="config.toml" copyLabel={t("copyLabel")} copiedLabel={t("copiedLabel")} copyFailedLabel={t("copyFailedLabel")}>{codexConfig}</CodeBlock>
          </div>
          <div>
            <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">
              {t("mcpClaudeTitle")}
            </h3>
            <CodeBlock label="shell" copyLabel={t("copyLabel")} copiedLabel={t("copiedLabel")} copyFailedLabel={t("copyFailedLabel")}>{claudeCommand}</CodeBlock>
          </div>
          <div>
            <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">
              {t("mcpGenericTitle")}
            </h3>
            <CodeBlock label="mcp.json" copyLabel={t("copyLabel")} copiedLabel={t("copiedLabel")} copyFailedLabel={t("copyFailedLabel")}>{genericConfig}</CodeBlock>
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              {t("mcpEndpointNote", { endpoint: MCP_ENDPOINT })}
            </p>
          </div>
        </div>
      </Section>

      <Section id="install-verify" stage={t("stage3Label")} title={t("skillTitle")}>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {t("skillIntro")}
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-primary)]">
          <li>{t("skillStep1")}</li>
          <li>{t("skillStep2")}</li>
          <li>{t("skillStep3")}</li>
        </ol>
      </Section>

      <Section id="verify" title={t("verifyTitle")}>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {t("verifyIntro")}
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-primary)]">
          <li>{t("verifyStep1")}</li>
          <li>{t("verifyStep2")}</li>
          <li>{t("verifyStep3")}</li>
        </ol>
        <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {t("verifySuccess")}
        </p>
      </Section>

      <Section id="troubleshoot-apply" stage={t("stage4Label")} title={t("troubleTitle")}>
        <dl className="space-y-4">
          {trouble.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--border)] px-4 py-3.5"
            >
              <dt className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
                {item.title}
              </dt>
              <dd className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {item.desc}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="apply" title={t("inviteTitle")}>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {t("inviteDesc")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={mailtoHref}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("inviteAction")}
          </a>
          <TransitionLink
            href={feedbackPath}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("feedbackCtaAction")}
          </TransitionLink>
        </div>
        <p className="mt-3 text-[13px] text-[var(--text-muted)]">{t("feedbackCta")}</p>
      </Section>
      </article>

      {/* 桌面右侧栏：粘性页内目录 + 快速入口 */}
      <aside className="hidden xl:block">
        <div className="sticky top-[calc(var(--site-nav-height)+1.5rem)] pt-16">
          <AgentToc
            title={t("tocLabel")}
            items={tocItems}
            quickTitle={t("quickLabel")}
            quickLinks={quickLinks}
          />
        </div>
      </aside>
    </div>
  );
}
