import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { Navbar } from "@/components/Navbar";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { ExperienceJourney } from "@/components/ExperienceJourney";
import { SkillRadar } from "@/components/viz/SkillRadar";
import { ActivityHeatmap } from "@/components/viz/ActivityHeatmap";
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
      category: t("skills.backend"),
      items: [
        "Node.js",
        "Python",
        locale === "zh" ? "API 设计" : "API Design",
        locale === "zh" ? "数据管线" : "Data Pipelines",
        locale === "zh" ? "调度与任务" : "Scheduling",
        locale === "zh" ? "存储与检索" : "Storage & Retrieval",
        locale === "zh" ? "全文搜索" : "Full-Text Search",
        locale === "zh" ? "MCP 服务与鉴权" : "MCP Services & Auth",
      ],
    },
    {
      category: t("skills.ai"),
      items: ["LLM APIs", "Streaming", "RAG", "Agent Systems", "Prompt Engineering"],
    },
    {
      category: t("skills.engineering"),
      items: [
        "System Design",
        "Performance Optimization",
        "CI/CD",
        locale === "zh" ? "可观测性" : "Observability",
      ],
    },
    {
      category: t("skills.design"),
      items: ["Interaction Design", "Motion Design", "Accessibility", "Design Systems"],
    },
  ];

  const radarAxes = [
    { label: t("radar.frontend"), value: 92 },
    { label: t("radar.backend"), value: 84 },
    { label: t("radar.pipelines"), value: 90 },
    { label: t("radar.aiEngineering"), value: 82 },
    { label: t("radar.motion"), value: 88 },
    { label: t("radar.design"), value: 75 },
    { label: t("radar.performance"), value: 86 },
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
    <main className="about-page min-h-screen">
      <Navbar />

      <PageHero label={t("label")} title={t("title")} description={t("intro")} />

      <div className="site-content">
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)]">
          {t("intro")}
        </p>
      </div>

      {/* Skills */}
      <section className="pb-16 pt-10 md:pt-16">
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
              <SkillRadar axes={radarAxes} />
              <dl className="sr-only">
                {radarAxes.map((axis) => (
                  <div key={axis.label}>
                    <dt>{axis.label}</dt>
                    <dd>{axis.value}</dd>
                  </div>
                ))}
              </dl>
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
              <ol className="sr-only">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <time dateTime={post.date}>{post.date}</time>
                    {post.title}
                  </li>
                ))}
              </ol>
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
          <div className="about-contact-panel grid items-center gap-8 rounded-2xl border border-[var(--border)] px-6 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 md:px-10 md:py-10">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight">
                {t("getInTouch")}
              </h2>
            </div>
            <div className="md:justify-self-end">
              <a
                href="mailto:ethan_pier@icloud.com"
                className="btn-primary inline-flex min-h-11 w-full items-center justify-center rounded-lg px-6 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:w-auto"
              >
                {t("sendEmail")}
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
