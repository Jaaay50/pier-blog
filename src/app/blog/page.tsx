import { BlogCard } from "@/components/BlogCard";
import { DecryptedText } from "@/components/effects/DecryptedText";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { Navbar } from "@/components/Navbar";
import { getAllPosts } from "@/lib/posts";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4">
            <DecryptedText
              text="All Articles"
              className="text-sm font-medium text-[var(--accent)]"
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Blog</h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Writing about frontend engineering, AI integration, system design,
            and the craft of building for the web.
          </p>
        </div>
      </section>

      {/* Article List */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl space-y-6">
          {posts.map((post, index) => (
            <ScrollReveal key={post.slug} delay={index * 100}>
              <BlogCard post={post} />
            </ScrollReveal>
          ))}
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
