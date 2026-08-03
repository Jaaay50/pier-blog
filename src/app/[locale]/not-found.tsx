import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PierGlyph } from "@/components/brand/PierGlyph";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * 404：Π glyph 水印 + 回首页。
 * Next 16 App Router：not-found 不接收路由 params，locale 由 URL 路由方案的
 * requestLocale 提供（next-intl），这里只 getTranslations。
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      <Navbar />
      <section className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-24">
        {/* 水印 glyph：桥下灯点微光 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <PierGlyph size={320} glow className="text-[var(--text-muted)] opacity-[0.05]" />
        </div>

        <div className="relative z-10 text-center">
          <p className="mb-4 font-mono text-sm tracking-[0.3em] text-[var(--text-muted)]">
            404
          </p>
          <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mb-10 max-w-md text-[var(--text-secondary)]">
            {t("description")}
          </p>
          <TransitionLink
            href="/"
            className="inline-block rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--accent-hover)]"
          >
            {t("backHome")}
          </TransitionLink>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
