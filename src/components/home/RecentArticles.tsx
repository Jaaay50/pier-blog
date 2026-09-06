import { TransitionLink } from "@/components/TransitionLink";
import type { BlogPost } from "@/lib/posts";

export function RecentArticles({ title, posts, readMore, locale }: {
  title: string;
  posts: BlogPost[];
  readMore: string;
  locale: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="home-articles-title" className="site-content py-16 md:py-24">
      <h2 id="home-articles-title" className="font-display mb-8 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <article key={post.slug} className="min-w-0">
            <TransitionLink href={`/blog/${post.slug}`} className="card-glass card-glass-hover flex h-full flex-col rounded-xl p-6">
              <time dateTime={post.date} className="mb-5 text-xs text-[var(--text-muted)]">
                {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
                  year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
                }).format(new Date(post.date))}
              </time>
              <h3 className="mb-3 text-lg font-semibold leading-snug tracking-tight">{post.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">{post.description}</p>
              <span className="mt-6 border-t border-[var(--border)] pt-4 text-sm font-medium text-[var(--accent)]">{readMore} <span aria-hidden="true">→</span></span>
            </TransitionLink>
          </article>
        ))}
      </div>
    </section>
  );
}
