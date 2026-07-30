import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { ImmersiveHero } from "@/components/ImmersiveHero";
import { SkillsShowcase } from "@/components/SkillsShowcase";
import { ProjectsBento } from "@/components/ProjectsBento";
import { HorizontalArticles } from "@/components/HorizontalArticles";
import { TransitionLink } from "@/components/TransitionLink";
import { MagneticWrapper } from "@/components/MagneticWrapper";
import { getAllPosts } from "@/lib/posts";

export default async function HomePage() {
  const t = await getTranslations("home");
  const tBlog = await getTranslations("blog");
  const tFooter = await getTranslations("footer");
  const posts = (await getAllPosts()).slice(0, 3);

  return (
    <main className="relative min-h-screen">
      <Navbar />

      {/* 第一屏：全屏沉浸式 Hero */}
      <ImmersiveHero
        titleLine1={t("heroTitleLine1")}
        titleLine2={t("heroTitleLine2")}
        subtitle={t("heroSubtitle")}
        scrollHint={t("scrollHint")}
      >
        <MagneticWrapper strength={0.25}>
          <TransitionLink
            href="/blog"
            className="btn-primary liquid-button rounded-xl px-6 py-3 font-medium"
          >
            {t("readArticles")}
          </TransitionLink>
        </MagneticWrapper>
        <MagneticWrapper strength={0.25}>
          <TransitionLink
            href="/about"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/60 px-6 py-3 font-medium backdrop-blur-md transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)]"
          >
            {t("aboutMe")}
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
            stars: "1.9k",
            forks: "320",
            url: "https://github.com/Jia-Ethan/codex-keysmith",
            size: "large",
          },
          {
            name: "claude-keysmith",
            desc: t("projects.claude"),
            stars: "435",
            forks: "83",
            url: "https://github.com/Jia-Ethan/claude-keysmith",
            size: "medium",
          },
          {
            name: "pavedpath-code",
            desc: t("projects.pavedpath"),
            stars: "381",
            forks: "34",
            url: "https://github.com/Jia-Ethan/pavedpath-code",
            size: "medium",
          },
          {
            name: "grok-keysmith",
            desc: t("projects.grok"),
            stars: "126",
            forks: "19",
            url: "https://github.com/Jia-Ethan/grok-keysmith",
            size: "large",
          },
        ]}
      />

      {/* 第四屏：文章横向滚动画廊 */}
      <HorizontalArticles
        title={t("recentArticles")}
        posts={posts}
        readMore={tBlog("readMore")}
      />

      {/* Footer */}
      <footer className="relative border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-4xl text-center text-sm text-[var(--text-muted)]">
          <p>© 2024 Pier. {tFooter("builtWith")}</p>
        </div>
      </footer>
    </main>
  );
}
