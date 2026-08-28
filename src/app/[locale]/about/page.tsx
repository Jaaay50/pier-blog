import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ThemedGradientText } from "@/components/ThemedGradientText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { ExperienceJourney } from "@/components/ExperienceJourney";
import { SkillRadar } from "@/components/viz/SkillRadar";
import { ActivityHeatmap } from "@/components/viz/ActivityHeatmap";
import { FluidBackground } from "@/components/webgl/FluidBackground";
import { SiteFooter } from "@/components/SiteFooter";
import { getAllPosts } from "@/lib/posts";
import { localizedMetadata, pageJsonLd } from "@/lib/site-metadata";
import { safeJsonLd } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata(locale, "about");
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");
  const posts = getAllPosts(locale);

  const skills = [
    {
      category: t("skills.frontend"),
      items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Three.js", "Framer Motion"],
    },
    {
      category: t("skills.ai"),
      items: ["LLM APIs", "Streaming", "RAG", "Agent Systems", "Prompt Engineering"],
    },
    {
      category: t("skills.engineering"),
      items: ["System Design", "Performance Optimization", "CI/CD", "Node.js", "Python"],
    },
    {
      category: t("skills.design"),
      items: ["Interaction Design", "Motion Design", "Accessibility", "Design Systems"],
    },
  ];

  const experiences = [
    {
      title: t("experiences.role1Title"),
      company: t("experiences.role1Company"),
      period: t("experiences.role1Period"),
      description: t("experiences.role1Desc"),
    },
    {
      title: t("experiences.role2Title"),
      company: t("experiences.role2Company"),
      period: t("experiences.role2Period"),
      description: t("experiences.role2Desc"),
    },
  ];

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <FluidBackground
          className="pointer-events-none absolute inset-0 opacity-30"
          intensity={0.5}
          speed={0.5}
        />
        <div className="site-content relative">
          <div className="reading-column-no-px">
            <div className="mb-4">
              <DecryptedText
                text={t("label")}
                className="text-sm font-medium text-[var(--text-muted)]"
              />
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
              <ThemedGradientText>{t("title")}</ThemedGradientText>
            </h1>
            <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
              {t("intro")}
            </p>
            <a
              href="https://cloudborne.cn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("cloudborneVisit")} (${t("opensInNewWindow")})`}
              className="mt-7 inline-flex min-h-11 max-w-full items-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {t("cloudborneVisit")} ↗
            </a>
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="py-16">
        <div className="site-content">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            {t("technicalStack")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.map((skill) => (
              <SpotlightCard
                key={skill.category}
                className="p-6"
                spotlightColor="rgba(59, 130, 246, 0.15)"
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {skill.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skill.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-[var(--bg-primary)] px-3 py-1 text-sm text-[var(--text-secondary)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* Skill Radar + Activity（Phase 6：数据可视化） */}
      <section className="py-16">
        <div className="site-content">
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div className="min-w-0">
              <h2 className="mb-6 text-2xl font-bold tracking-tight">
                {t("radarTitle")}
              </h2>
              <SkillRadar
                axes={[
                  { label: t("radar.frontend"), value: 92 },
                  { label: t("radar.motion"), value: 88 },
                  { label: t("radar.ai"), value: 80 },
                  { label: t("radar.engineering"), value: 85 },
                  { label: t("radar.design"), value: 75 },
                  { label: t("radar.performance"), value: 86 },
                ]}
              />
            </div>
            <div className="min-w-0">
              <h2 className="mb-6 text-2xl font-bold tracking-tight">
                {t("activityTitle")}
              </h2>
              <ActivityHeatmap
                postDates={posts.map((p) => p.date)}
                emptyMessage={t("activityEmpty")}
                countMessage={t("activityCount", { count: posts.length })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Experience（Phase 5：桌面横向滚动叙事 + SVG 路径绘制，移动端竖向降级） */}
      <ExperienceJourney title={t("experience")} experiences={experiences} />

      {/* 独立产品：在经历与联系之间承接“现在正在做什么” */}
      <section className="py-16">
        <div className="site-content">
          <div className="card-glass card-glass-hover flex min-w-0 flex-col gap-8 rounded-2xl p-7 md:flex-row md:items-center md:justify-between md:p-9">
            <div className="min-w-0 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {t("cloudborneLabel")}
              </p>
              <h2 className="mb-3 text-2xl font-bold tracking-tight">Cloudborne</h2>
              <p className="leading-relaxed text-[var(--text-secondary)]">
                {t("cloudborneDescription")}
              </p>
            </div>
            <a
              href="https://cloudborne.cn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("cloudborneVisit")} (${t("opensInNewWindow")})`}
              className="inline-flex min-h-11 w-full max-w-full shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:w-auto"
            >
              {t("cloudborneVisit")} ↗
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16">
        <div className="site-content">
          <div className="reading-column-no-px">
            <h2 className="mb-4 text-2xl font-bold tracking-tight">
              {t("getInTouch")}
            </h2>
            <p className="mb-6 text-[var(--text-secondary)]">
              {t("contactPrompt")}
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:ethan_pier@icloud.com"
                className="inline-flex min-h-11 max-w-full items-center rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {t("sendEmail")}
              </a>
              <a
                href="https://github.com/Jia-Ethan"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`GitHub (${t("opensInNewWindow")})`}
                className="inline-flex min-h-11 max-w-full items-center rounded-lg border border-[var(--border)] px-6 py-3 font-medium transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(pageJsonLd(locale, "about")) }}
      />
      <SiteFooter />
    </main>
  );
}
