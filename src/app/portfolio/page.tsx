import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import DecryptedText from "@/components/reactbits/DecryptedText";
import { ThemedGradientText } from "@/components/ThemedGradientText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { FluidBackground } from "@/components/webgl/FluidBackground";
import { getGitHubStats } from "@/lib/github";

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
}

// 互动作品（磷光分区已下线）

// 作品元数据（文案走 i18n，这里只放结构化信息）
const PROJECTS: Project[] = [
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

export default async function PortfolioPage() {
  const t = await getTranslations("portfolio");
  const tHome = await getTranslations("home");
  const tFooter = await getTranslations("footer");
  const githubStats = await getGitHubStats();

  const featured = PROJECTS.filter((p) => p.featured);
  const rest = PROJECTS.filter((p) => !p.featured);

  const taglineOf = (p: Project) => tHome(p.tagline.key);

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header：灯塔式的静谧开场 */}
      <section className="relative overflow-hidden px-6 py-24">
        <FluidBackground
          className="pointer-events-none absolute inset-0 opacity-30"
          intensity={0.5}
          speed={0.5}
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-5">
            <DecryptedText
              text={t("label")}
              className="text-sm font-medium tracking-[0.3em] text-[var(--accent)]"
              speed={30}
            />
          </div>
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl">
            <ThemedGradientText>{t("title")}</ThemedGradientText>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* 磷光互动作品已下线 */}

      {/* 精选作品：大卡片，一盏一盏的灯 */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
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
                  className="group flex h-full flex-col border-[var(--border)] bg-[var(--bg-card)] p-8"
                  spotlightColor="rgba(217, 119, 87, 0.12)"
                >
                  {/* 顶部：年份 */}
                  <div className="mb-6 flex items-center justify-end">
                    <span className="text-xs tracking-[0.2em] text-[var(--text-muted)]">
                      {project.launched}
                    </span>
                  </div>

                  {/* 名称 + 简介 */}
                  <h3 className="mb-2 text-xl font-bold transition-colors group-hover:text-[var(--accent)]">
                    {project.name}
                  </h3>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {taglineOf(project)}
                  </p>

                  {/* 技术栈标签 */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
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
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--accent)] transition-opacity hover:opacity-80"
                    >
                      {t("viewProject")} →
                    </a>
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
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
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
                  className="group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-3">
                      <code className="text-sm font-semibold text-[var(--accent)]">
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-6xl text-center text-sm text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} Pier. {tFooter("builtWith")}</p>
        </div>
      </footer>
    </main>
  );
}
