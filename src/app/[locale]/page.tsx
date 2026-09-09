import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { ImmersiveHero } from "@/components/ImmersiveHero";
import { HomeFeature } from "@/components/home/HomeFeature";
import { ProjectsBento } from "@/components/ProjectsBento";
import { RecentArticles } from "@/components/home/RecentArticles";
import { LabTeaser } from "@/components/LabTeaser";
import { SiteFooter } from "@/components/SiteFooter";
import { Waterline } from "@/components/Waterline";
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
      <ImmersiveHero subtitle={t("heroSubtitle")} />

      <HomeFeature locale={locale} />

      <RecentArticles
        title={t("recentArticles")}
        posts={posts}
        readMore={tBlog("readMore")}
        locale={locale}
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

      <LabTeaser enterLab={t("enterLab")} />

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
