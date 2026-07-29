import { useTranslations } from "next-intl";
import { Navbar } from "@/components/Navbar";
import GradientText from "@/components/reactbits/GradientText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

export default function AboutPage() {
  const t = useTranslations("about");
  const tFooter = useTranslations("footer");

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
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4">
            <DecryptedText
              text={t("label")}
              className="text-sm font-medium text-[var(--accent)]"
            />
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
            <GradientText>{t("title")}</GradientText>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            {t("intro")}
          </p>
        </div>
      </section>

      {/* Skills */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            {t("technicalStack")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.map((skill) => (
              <SpotlightCard
                key={skill.category}
                className="border-[var(--border)] bg-[var(--bg-card)] p-6"
                spotlightColor="rgba(59, 130, 246, 0.15)"
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
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

      {/* Experience */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            {t("experience")}
          </h2>
          <div className="space-y-8">
            {experiences.map((exp) => (
              <div
                key={exp.title}
                className="group border-l-2 border-[var(--border)] pl-6 transition-colors hover:border-[var(--accent)]"
              >
                <div className="mb-1 text-sm text-[var(--text-muted)]">
                  {exp.period}
                </div>
                <h3 className="mb-1 text-lg font-semibold">{exp.title}</h3>
                <div className="mb-2 text-sm text-[var(--accent)]">
                  {exp.company}
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {exp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            {t("getInTouch")}
          </h2>
          <p className="mb-6 text-[var(--text-secondary)]">
            {t("contactPrompt")}
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:contact@pier.dev"
              className="rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--accent-hover)]"
            >
              {t("sendEmail")}
            </a>
            <a
              href="https://github.com/Jia-Ethan"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[var(--border)] px-6 py-3 font-medium transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)]"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-4xl text-center text-sm text-[var(--text-muted)]">
          <p>© 2024 Pier. {tFooter("builtWith")}</p>
        </div>
      </footer>
    </main>
  );
}
