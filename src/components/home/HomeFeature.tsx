import { TransitionLink } from "@/components/TransitionLink";
import { HomeFeatureImage } from "./HomeFeatureImage";
import { editorialLocale, homeEditorial, type HomeEditorial } from "@/lib/home-editorial";

export function HomeFeature({ locale, feature = homeEditorial }: { locale: string; feature?: HomeEditorial }) {
  const copy = feature.copy[editorialLocale(locale)];

  return (
    <section aria-labelledby="home-feature-title" className="site-content relative py-20 md:py-24">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {copy.label}
      </p>
      <h2 id="home-feature-title" className="font-display mb-6 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
        {copy.title}
      </h2>
      <p className="max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
        {copy.body}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <TransitionLink href={feature.primaryHref} className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3 font-medium transition-colors hover:border-[var(--border-hover)]">
          {copy.primaryLabel} <span aria-hidden="true" className="ml-2">→</span>
        </TransitionLink>
        <TransitionLink href={feature.secondaryHref} className="inline-flex min-h-11 items-center py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
          {copy.secondaryLabel} <span aria-hidden="true" className="ml-2">→</span>
        </TransitionLink>
      </div>
      {feature.image && <HomeFeatureImage image={feature.image} locale={locale} />}
    </section>
  );
}
