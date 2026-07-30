import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { getAllPosts } from "@/lib/posts";
import DecryptedText from "@/components/reactbits/DecryptedText";
import { FluidBackground } from "@/components/webgl/FluidBackground";
import { BlogStatsFilter } from "@/components/viz/BlogStatsFilter";

export default async function BlogPage() {
  const posts = await getAllPosts();
  const t = await getTranslations("blog");
  const tFooter = await getTranslations("footer");

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header（带流体 Shader 背景，低端设备自动降级为静态渐变） */}
      <section className="relative overflow-hidden px-6 py-20">
        <FluidBackground
          className="pointer-events-none absolute inset-0 opacity-40"
          intensity={0.6}
          speed={0.6}
        />
        <div className="relative mx-auto max-w-4xl">
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

      {/* Tag 统计条形图 + 可过滤文章列表（Phase 6） */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <BlogStatsFilter
            posts={posts.map(({ slug, title, description, date, tags }) => ({
              slug,
              title,
              description,
              date,
              tags,
            }))}
            allLabel={t("allTag")}
          />
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
