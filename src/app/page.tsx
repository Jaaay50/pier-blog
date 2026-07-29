import Link from "next/link";
import { GradientText } from "@/components/effects/GradientText";
import { BlogCard } from "@/components/BlogCard";
import { Hyperspeed } from "@/components/effects/Hyperspeed";
import { Navbar } from "@/components/Navbar";

const posts = [
  {
    slug: "building-modern-ai-interfaces",
    title: "Building Modern AI Interfaces",
    description:
      "Exploring patterns for integrating LLMs into production web applications with streaming, error handling, and user feedback.",
    date: "2024-03-15",
    tags: ["AI", "React", "System Design"],
  },
  {
    slug: "frontend-performance-optimization",
    title: "Frontend Performance Optimization",
    description:
      "A deep dive into modern web performance: Core Web Vitals, lazy loading, code splitting, and real-world measurement strategies.",
    date: "2024-03-08",
    tags: ["Performance", "Next.js", "Web Vitals"],
  },
  {
    slug: "state-management-in-2024",
    title: "State Management in 2024",
    description:
      "Comparing modern state management approaches: Server Components, React Context, Zustand, and when to use each pattern.",
    date: "2024-02-28",
    tags: ["React", "Architecture", "State Management"],
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* 背景动效 */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <Hyperspeed />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 opacity-0 animate-fade-in">
            <span className="text-sm font-medium text-[var(--accent)]">
              Frontend Engineer
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight opacity-0 animate-fade-in-up stagger-1 md:text-6xl lg:text-7xl">
            <GradientText>
              Building interfaces
              <br />
              that feel alive
            </GradientText>
          </h1>

          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] opacity-0 animate-fade-in-up stagger-2">
            I craft interactive web experiences at the intersection of AI,
            design, and engineering. Currently exploring how Large Language
            Models reshape user interaction patterns.
          </p>

          <div className="flex gap-4 opacity-0 animate-fade-in-up stagger-3">
            <Link
              href="/blog"
              className="rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/20"
            >
              Read Articles
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-[var(--border)] px-6 py-3 font-medium transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-card)]"
            >
              About Me
            </Link>
          </div>
        </div>
      </section>

      {/* 开源项目 */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-3xl font-bold tracking-tight">
            Open Source
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="https://github.com/Jia-Ethan/codex-keysmith"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]"
            >
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
                <span className="font-semibold group-hover:text-[var(--accent)] transition-colors">codex-keysmith</span>
              </div>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                Enterprise-grade key management for Codex CLI
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
                  1.9k
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
                  320
                </span>
                <span className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5">TypeScript</span>
              </div>
            </a>

            <a
              href="https://github.com/Jia-Ethan/claude-keysmith"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]"
            >
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
                <span className="font-semibold group-hover:text-[var(--accent)] transition-colors">claude-keysmith</span>
              </div>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                Secure key management for Claude Code CLI
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
                  435
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
                  83
                </span>
                <span className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5">TypeScript</span>
              </div>
            </a>

            <a
              href="https://github.com/Jia-Ethan/pavedpath-code"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]"
            >
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
                <span className="font-semibold group-hover:text-[var(--accent)] transition-colors">pavedpath-code</span>
              </div>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                AI-powered development workflow framework
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
                  381
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
                  34
                </span>
                <span className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5">TypeScript</span>
              </div>
            </a>

            <a
              href="https://github.com/Jia-Ethan/grok-keysmith"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]"
            >
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
                <span className="font-semibold group-hover:text-[var(--accent)] transition-colors">grok-keysmith</span>
              </div>
              <p className="mb-3 text-sm text-[var(--text-secondary)]">
                Key management for Grok CLI tools
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
                  126
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>
                  19
                </span>
                <span className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5">TypeScript</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* 文章列表 */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-3xl font-bold tracking-tight">
            Recent Articles
          </h2>

          <div className="space-y-6">
            {posts.map((post, index) => (
              <div
                key={post.slug}
                className={`opacity-0 animate-fade-in-up stagger-${Math.min(
                  index + 1,
                  5
                )}`}
              >
                <BlogCard post={post} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-4xl text-center text-sm text-[var(--text-muted)]">
          <p>© 2024 Pier. Built with Next.js, React, and Tailwind CSS.</p>
        </div>
      </footer>
    </main>
  );
}
