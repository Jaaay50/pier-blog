import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Navbar } from "@/components/Navbar";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { SiteFooter } from "@/components/SiteFooter";
import { getGitHubStats } from "@/lib/github";
import { localizedMetadata, pageJsonLd } from "@/lib/site-metadata";
import { safeJsonLd } from "@/lib/json-ld";
import { TransitionLink } from "@/components/TransitionLink";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata(locale, "portfolio");
}

interface Project {
  id: string;
  name: string;
  tagline: { key: string };
  url: string;
  repo?: string;
  tech: string[];
  launched: string;
  featured: boolean;
  /** 对应 getGitHubStats() 返回数组的下标；无则不显示 star/fork */
  statsIndex?: number;
  /** 站内作品：url 走 TransitionLink，可附第二条 CTA */
  internal?: boolean;
  secondaryHref?: string;
}

// 互动作品（磷光分区已下线）

// 作品元数据（文案走 i18n，这里只放结构化信息）
const PROJECTS: Project[] = [
  {
    id: "currents",
    name: "Currents",
    tagline: { key: "projects.currents" },
    url: "/currents",
    tech: ["Next.js", "Node.js", "LLM", "MCP"],
    launched: "2026",
    featured: true,
    internal: true,
    secondaryHref: "/currents/agent",
  },
  {
    id: "codex-keysmith",
    name: "Codex Keysmith",
    tagline: { key: "projects.codex" },
    url: "https://github.com/Jia-Ethan/codex-keysmith",
    repo: "Jia-Ethan/codex-keysmith",
    tech: ["TypeScript", "Node.js", "CLI"],
    launched: "2026",
    featured: true,
    statsIndex: 0,
  },
  {
    id: "claude-keysmith",
    name: "Claude Keysmith",
    tagline: { key: "projects.claude" },
    url: "https://github.com/Jia-Ethan/claude-keysmith",
    repo: "Jia-Ethan/claude-keysmith",
    tech: ["TypeScript", "Node.js", "CLI"],
    launched: "2026",
    featured: true,
    statsIndex: 1,
  },
  {
    id: "pavedpath-code",
    name: "PavedPath Code",
    tagline: { key: "projects.pavedpath" },
    url: "https://github.com/Jia-Ethan/pavedpath-code",
    repo: "Jia-Ethan/pavedpath-code",
    tech: ["TypeScript", "AI Workflow"],
    launched: "2026",
    featured: false,
    statsIndex: 2,
  },
  {
    id: "grok-keysmith",
    name: "Grok Keysmith",
    tagline: { key: "projects.grok" },
    url: "https://github.com/Jia-Ethan/grok-keysmith",
    repo: "Jia-Ethan/grok-keysmith",
    tech: ["TypeScript", "Node.js", "CLI"],
    launched: "2026",
    featured: false,
    statsIndex: 3,
  },
];

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("portfolio");
  const tHome = await getTranslations("home");
  const githubStats = await getGitHubStats();

  const featured = PROJECTS.filter((p) => p.featured);
  const rest = PROJECTS.filter((p) => !p.featured);

  const taglineOf = (p: Project) =>
    p.id === "currents" ? t("currentsDesc") : tHome(p.tagline.key);
  const nameOf = (p: Project) => (p.id === "currents" ? t("currentsName") : p.name);
  const techOf = (p: Project) =>
    p.id === "currents"
      ? locale === "zh"
        ? ["Next.js", "Node.js", "数据管线", "LLM", "MCP"]
        : ["Next.js", "Node.js", "Data Pipeline", "LLM", "MCP"]
      : p.tech;

  return (
    <main className="min-h-screen">
      <Navbar />

      <PageHero label={t("label")} title={t("title")} description={t("subtitle")} />

      {/* 磷光互动作品已下线 */}

      {/* 精选作品：大卡片，一盏一盏的灯 */}
      <section className="pb-12 pt-10 md:pt-16">
        <div className="site-content">
          <h2 className="mb-10 text-2xl font-bold tracking-wide">
            {t("featured")}
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {featured.map((project) => {
              const stats =
                project.statsIndex !== undefined
                  ? githubStats[project.statsIndex]
                  : null;
              return (
                <SpotlightCard
                  key={project.id}
                  className="group flex h-full flex-col p-8"
                  spotlightColor="rgba(217, 119, 87, 0.12)"
                >
                  {/* 顶部：年份 */}
                  <div className="mb-6 flex items-center justify-end">
                    <span className="text-xs tracking-[0.2em] text-[var(--text-muted)]">
                      {project.launched}
                    </span>
                  </div>

                  {/* 名称 + 简介 */}
                  <h3 className="mb-2 text-xl font-bold transition-colors">
                    {nameOf(project)}
                  </h3>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {taglineOf(project)}
                  </p>

                  {/* 技术栈标签 */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    {techOf(project).map((tech) => (
                      <span
                        key={tech}
                        className="rounded bg-[var(--bg-primary)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* 底部：链接 + stars */}
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {project.internal ? (
                        <TransitionLink
                          href={project.url}
                          className="text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
                        >
                          {t("viewProject")} →
                        </TransitionLink>
                      ) : (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
                        >
                          {t("viewProject")} →
                        </a>
                      )}
                      {project.secondaryHref ? (
                        <TransitionLink
                          href={project.secondaryHref}
                          className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                        >
                          {t("currentsAgent")} →
                        </TransitionLink>
                      ) : null}
                    </div>
                    {stats && (
                      <span className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>★ {stats.stars}</span>
                        <span>⑂ {stats.forks}</span>
                      </span>
                    )}
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* 其余项目：紧凑列表 */}
      <section className="py-12">
        <div className="site-content">
          <h2 className="mb-10 text-2xl font-bold tracking-wide">
            {t("allProjects")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rest.map((project) => {
              const stats =
                project.statsIndex !== undefined
                  ? githubStats[project.statsIndex]
                  : null;
              return (
                <a
                  key={project.id}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-glass card-glass-hover group flex items-center justify-between rounded-lg p-5"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-3">
                      <code className="text-sm font-semibold text-[var(--text-primary)]">
                        {project.name}
                      </code>
                      <span className="text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
                        {project.launched}
                      </span>
                    </div>
                    <p className="truncate text-sm text-[var(--text-secondary)]">
                      {taglineOf(project)}
                    </p>
                  </div>
                  {stats && (
                    <span className="ml-4 shrink-0 text-xs text-[var(--text-muted)]">
                      ★ {stats.stars}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(pageJsonLd(locale, "portfolio")) }}
      />
      <SiteFooter />
    </main>
  );
}
