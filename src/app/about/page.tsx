import { GradientText } from "@/components/effects/GradientText";
import { DecryptedText } from "@/components/effects/DecryptedText";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

const skills = [
  {
    category: "Frontend",
    items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Three.js", "Framer Motion"],
  },
  {
    category: "AI & Integration",
    items: ["LLM APIs", "Streaming", "RAG", "Agent Systems", "Prompt Engineering"],
  },
  {
    category: "Engineering",
    items: ["System Design", "Performance Optimization", "CI/CD", "Node.js", "Python"],
  },
  {
    category: "Design",
    items: ["Interaction Design", "Motion Design", "Accessibility", "Design Systems"],
  },
];

const experiences = [
  {
    title: "Frontend Engineer",
    company: "Building AI-native products",
    period: "2023 — Present",
    description:
      "Crafting high-performance web applications that integrate AI capabilities. Focus on streaming interfaces, real-time collaboration, and delightful micro-interactions.",
  },
  {
    title: "Full-Stack Developer",
    company: "Web Applications & Tooling",
    period: "2021 — 2023",
    description:
      "Delivered production systems with React, Node.js, and cloud infrastructure. Focused on developer experience, component architecture, and build optimization.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4">
            <DecryptedText
              text="About Me"
              className="text-sm font-medium text-[var(--accent)]"
            />
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
            <GradientText>
              I build things for the web.
            </GradientText>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            Frontend engineer focused on crafting interactive, performant, and
            accessible web experiences. I believe great interfaces are invisible —
            they feel natural, responsive, and alive.
          </p>
        </div>
      </section>

      {/* Skills */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            Technical Stack
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.map((skill) => (
              <SpotlightCard key={skill.category} className="p-6">
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
            Experience
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
            Get in Touch
          </h2>
          <p className="mb-6 text-[var(--text-secondary)]">
            Interested in working together or just want to chat about tech?
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:contact@pier.dev"
              className="rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--accent-hover)]"
            >
              Send Email
            </a>
            <a
              href="https://github.com/yourusername"
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
          <p>© 2024 Pier. Built with Next.js, React, and Tailwind CSS.</p>
        </div>
      </footer>
    </main>
  );
}
