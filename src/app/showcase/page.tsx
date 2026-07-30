import { useTranslations } from "next-intl";
import { Navbar } from "@/components/Navbar";
import GradientText from "@/components/reactbits/GradientText";
import BlurText from "@/components/reactbits/BlurText";
import DecryptedText from "@/components/reactbits/DecryptedText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import ShinyText from "@/components/reactbits/ShinyText";
import Aurora from "@/components/reactbits/Aurora";
import Particles from "@/components/reactbits/Particles";
import Galaxy from "@/components/reactbits/Galaxy";
import { FluidBackground } from "@/components/webgl/FluidBackground";
import { CardStack3D } from "@/components/webgl/CardStack3D";

export default function ShowcasePage() {
  const t = useTranslations("showcase");
  const tFooter = useTranslations("footer");

  const components = [
    {
      name: "GradientText",
      description: "Animated gradient text with shimmer effect",
      category: "Text",
    },
    {
      name: "BlurText",
      description: "Text reveals with blur and stagger animation",
      category: "Text",
    },
    {
      name: "DecryptedText",
      description: "Hacker-style decryption animation",
      category: "Text",
    },
    {
      name: "ShinyText",
      description: "Metallic shine sweep effect",
      category: "Text",
    },
    {
      name: "SpotlightCard",
      description: "Mouse-following spotlight gradient",
      category: "Card",
    },
    {
      name: "Aurora",
      description: "Smooth flowing aurora background",
      category: "Background",
    },
    {
      name: "Particles",
      description: "Connected particles with physics",
      category: "Background",
    },
    {
      name: "Galaxy",
      description: "Interactive WebGL star field with mouse repulsion",
      category: "Background",
    },
    {
      name: "ShaderGradient",
      description: "Fluid noise gradient shader with domain warping",
      category: "Background",
    },
    {
      name: "CardStack3D",
      description: "Draggable 3D perspective card stack",
      category: "Card",
    },
  ];

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <DecryptedText
              text={t("label")}
              className="text-sm font-medium text-[var(--accent)]"
              speed={30}
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            <GradientText>{t("title")}</GradientText>
          </h1>
          <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Text Effects */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">{t("textEffects")}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                GradientText
              </div>
              <GradientText className="text-2xl font-bold">
                Gradient Flow
              </GradientText>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Animated gradient with smooth motion
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                BlurText
              </div>
              <BlurText
                text="Smooth Reveal"
                className="text-2xl font-bold"
                delay={30}
              />
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Word-by-word blur reveal
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                DecryptedText
              </div>
              <DecryptedText
                text="Decrypt Effect"
                className="text-2xl font-bold"
                speed={40}
              />
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Hacker-style text decryption
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                ShinyText
              </div>
              <ShinyText
                text="Shiny Text"
                className="text-2xl font-bold"
                speed={4}
              />
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Metallic shine sweep
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Card Interactions */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">{t("cardInteractions")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <SpotlightCard
              className="border-[var(--border)] bg-[var(--bg-card)] p-8"
              spotlightColor="rgba(59, 130, 246, 0.2)"
            >
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                SpotlightCard
              </div>
              <h3 className="mb-2 text-xl font-bold">Spotlight Follow</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("hintSpotlight")}
              </p>
            </SpotlightCard>

            {/* CardStack3D demo */}
            <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
              <div className="self-start text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                CardStack3D
              </div>
              <CardStack3D
                className="h-40 w-full max-w-sm"
                cards={[
                  ["#d97757", "Design"],
                  ["#6a9bcc", "Engineer"],
                  ["#8b7fcc", "Ship"],
                ].map(([color, label]) => (
                  <div
                    key={label}
                    className="flex h-full w-full select-none items-center justify-center rounded-xl border border-[var(--border)] text-xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </div>
                ))}
              />
              <p className="text-sm text-[var(--text-secondary)]">
                Click or drag the top card to cycle the stack.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Background Effects */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">{t("backgroundEffects")}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="absolute inset-0 opacity-60">
                <Aurora />
              </div>
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-[var(--accent)]">
                    Aurora
                  </div>
                  <div className="text-xl font-bold">Flowing Lights</div>
                </div>
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <Particles
                particleCount={60}
                particleColors={["#3b82f6", "#60a5fa", "#93c5fd"]}
                moveParticlesOnHover
              />
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-[var(--accent)]">
                    Particles
                  </div>
                  <div className="text-xl font-bold">Connected Network</div>
                </div>
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-black">
              <Galaxy
                mouseInteraction
                mouseRepulsion
                density={3000}
                glowIntensity={0.6}
                twinkleIntensity={0.5}
              />
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-blue-400">
                    Galaxy
                  </div>
                  <div className="text-xl font-bold text-white">Star Field</div>
                </div>
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <FluidBackground className="absolute inset-0" intensity={0.8} />
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-[var(--accent)]">
                    ShaderGradient
                  </div>
                  <div className="text-xl font-bold">Fluid Noise</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Component List */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">{t("allComponents")}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {components.map((component) => (
              <div
                key={component.name}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--border-hover)]"
              >
                <div className="mb-1 flex items-center justify-between">
                  <code className="text-sm font-semibold text-[var(--accent)]">
                    {component.name}
                  </code>
                  <span className="rounded bg-[var(--bg-primary)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                    {component.category}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {component.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-6xl text-center text-sm text-[var(--text-muted)]">
          <p>© 2024 Pier. {tFooter("builtWith")}</p>
        </div>
      </footer>
    </main>
  );
}
