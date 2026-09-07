import { ThemedGradientText } from "@/components/ThemedGradientText";
import { FluidBackground } from "@/components/webgl/FluidBackground";

interface PageHeroProps {
  label: string;
  title: string;
  description: string;
}

export function PageHero({ label, title, description }: PageHeroProps) {
  return (
    <header className="page-hero relative overflow-hidden py-12 md:py-20">
      <FluidBackground
        className="pointer-events-none absolute inset-0 opacity-40"
        intensity={0.6}
        speed={0.6}
      />
      <div className="site-content relative">
        <p className="mb-4 text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
          <ThemedGradientText>{title}</ThemedGradientText>
        </h1>
        <p className="max-w-2xl text-lg text-[var(--text-secondary)]">{description}</p>
      </div>
    </header>
  );
}
