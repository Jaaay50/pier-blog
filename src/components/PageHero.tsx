import { ThemedGradientText } from "@/components/ThemedGradientText";
import { FluidBackground } from "@/components/webgl/FluidBackground";

interface PageHeroProps {
  label: string;
  title: string;
  description: string;
  /** 岸 / 现在：静纸，不用 Fluid 与渐变字抢灯 */
  quiet?: boolean;
}

export function PageHero({ label, title, quiet = false }: PageHeroProps) {
  return (
    <header className={`page-hero relative overflow-hidden ${quiet ? "page-hero-quiet" : "py-12 md:py-20"}`}>
      {!quiet && (
        <FluidBackground
          className="pointer-events-none absolute inset-0 opacity-40"
          intensity={0.6}
          speed={0.6}
        />
      )}
      <div className={`${quiet ? "reading-column" : "site-content"} relative`}>
        <p className="mb-4 text-sm font-medium text-[var(--text-muted)]">{label}</p>
        {quiet ? (
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {title}
          </h1>
        ) : (
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            <ThemedGradientText>{title}</ThemedGradientText>
          </h1>
        )}
      </div>
    </header>
  );
}
