import { getTranslations } from "next-intl/server";
import { BlogCard } from "@/components/BlogCard";
import { Navbar } from "@/components/Navbar";
import { getAllPosts } from "@/lib/posts";
import DecryptedText from "@/components/reactbits/DecryptedText";
import AnimatedContent from "@/components/reactbits/AnimatedContent";

export default async function BlogPage() {
  const posts = await getAllPosts();
  const t = await getTranslations("blog");
  const tFooter = await getTranslations("footer");

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4">
            <DecryptedText
              text={t("label")}
              className="text-sm font-medium text-[var(--accent)]"
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-lg text-[var(--text-secondary)]">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Article List */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl space-y-6">
          {posts.map((post, index) => (
            <AnimatedContent key={post.slug} delay={index * 100}>
              <BlogCard post={post} />
            </AnimatedContent>
          ))}
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
