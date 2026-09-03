import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { ImmersiveHero } from "@/components/ImmersiveHero";
import { SkillsShowcase } from "@/components/SkillsShowcase";
import { ProjectsBento } from "@/components/ProjectsBento";
import { HorizontalArticles } from "@/components/HorizontalArticles";
import { LabTeaser } from "@/components/LabTeaser";
import { SiteFooter } from "@/components/SiteFooter";
import { Waterline } from "@/components/Waterline";
import { TransitionLink } from "@/components/TransitionLink";
import { MagneticWrapper } from "@/components/MagneticWrapper";
import { getAllPosts } from "@/lib/posts";
import { getGitHubStats } from "@/lib/github";
import { localizedMetadata, pageJsonLd } from "@/lib/site-metadata";
import { safeJsonLd } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return localizedMetadata(locale, "home");
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tBlog = await getTranslations("blog");
  const posts = getAllPosts(locale).slice(0, 3);
  const githubStats = await getGitHubStats();

  return (
    <main className="relative min-h-screen">
      <Navbar />

      {/* 第一屏：全屏沉浸式 Hero */}
      <ImmersiveHero subtitle={t("heroSubtitle")}>
        <MagneticWrapper strength={0.25}>
          <TransitionLink
            href="/blog"
            className="rounded-xl bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--border)] px-8 py-3 font-medium transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)]"
          >
            {t("readArticles")}
          </TransitionLink>
        </MagneticWrapper>
      </ImmersiveHero>

      {/* 第二屏：技能展示（活动效 demo 卡片） */}
      <SkillsShowcase
        title={t("skillsTitle")}
        subtitle={t("skillsSubtitle")}
        skills={{
          webgl: {
            title: t("skills.webgl.title"),
            desc: t("skills.webgl.desc"),
          },
          motion: {
            title: t("skills.motion.title"),
            desc: t("skills.motion.desc"),
          },
          craft: {
            title: t("skills.craft.title"),
            desc: t("skills.craft.desc"),
          },
        }}
      />

      {/* 第三屏：项目展示 Bento Grid */}
      <ProjectsBento
        title={t("projectsTitle")}
        projects={[
          {
            name: "codex-keysmith",
            desc: t("projects.codex"),
            stars: githubStats[0].stars,
            forks: githubStats[0].forks,
            url: "https://github.com/Jia-Ethan/codex-keysmith",
            size: "large",
          },
          {
            name: "claude-keysmith",
            desc: t("projects.claude"),
            stars: githubStats[1].stars,
            forks: githubStats[1].forks,
            url: "https://github.com/Jia-Ethan/claude-keysmith",
            size: "medium",
          },
          {
            name: "pavedpath-code",
            desc: t("projects.pavedpath"),
            stars: githubStats[2].stars,
            forks: githubStats[2].forks,
            url: "https://github.com/Jia-Ethan/pavedpath-code",
            size: "medium",
          },
          {
            name: "grok-keysmith",
            desc: t("projects.grok"),
            stars: githubStats[3].stars,
            forks: githubStats[3].forks,
            url: "https://github.com/Jia-Ethan/grok-keysmith",
            size: "large",
          },
        ]}
      />

      {/* 潮汐：全栈主证据，插在开源项目与 Lab 之间 */}
      <section className="site-content py-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {t("currentsTitle")}
        </p>
        <h2 className="font-display mb-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
          {t("currentsSubtitle")}
        </h2>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
          {t("currentsBody")}
        </p>
        <div className="flex flex-wrap gap-4">
          <TransitionLink
            href="/currents"
            className="rounded-xl bg-[var(--bg-card)]/80 px-6 py-3 font-medium backdrop-blur-md border border-[var(--border)] transition-all hover:border-[var(--border-hover)]"
          >
            {t("currentsEnter")} →
          </TransitionLink>
          <TransitionLink
            href="/currents/agent"
            className="inline-flex min-h-11 items-center px-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {t("currentsAgent")} →
          </TransitionLink>
        </div>
      </section>

      {/* Lab 引流带：排在潮汐后面 */}
      <LabTeaser label={t("labTeaser")} enterLab={t("enterLab")} />

      {/* 第五屏：文章横向滚动画廊 */}
      <HorizontalArticles
        title={t("recentArticles")}
        posts={posts}
        readMore={tBlog("readMore")}
      />

      {/* 静态发丝分隔线（原 WaveGrid 3D 波浪，视觉减法后移除；Phase 10.3 组件化为 Waterline） */}
      <Waterline className="my-24" />

      {/* Footer */}
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(pageJsonLd(locale, "home")) }}
      />
    </main>
  );
}
