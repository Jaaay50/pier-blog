import Link from "next/link";
import { DecryptedText } from "@/components/effects/DecryptedText";
import { GradientText } from "@/components/effects/GradientText";
import { Navbar } from "@/components/Navbar";
import { BlurText } from "@/components/effects/BlurText";
import { TiltCard } from "@/components/effects/TiltCard";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { Ripple } from "@/components/effects/Ripple";
import { Aurora } from "@/components/effects/Aurora";
import { Particles } from "@/components/effects/Particles";
import { Hyperspeed } from "@/components/effects/Hyperspeed";

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
    name: "TiltCard",
    description: "3D tilt effect with glare on hover",
    category: "Card",
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
    name: "Hyperspeed",
    description: "Star field with parallax motion",
    category: "Background",
  },
  {
    name: "Ripple",
    description: "Concentric ripple pulse animation",
    category: "Effect",
  },
];

export default function ShowcasePage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4">
            <DecryptedText
              text="Component Library"
              className="text-sm font-medium text-[var(--accent)]"
            />
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            <GradientText>Interactive Components</GradientText>
          </h1>
          <p className="max-w-2xl text-lg text-[var(--text-secondary)]">
            Custom-built animation components showcasing modern web interactions.
            Built with React, TypeScript, and Canvas API.
          </p>
        </div>
      </section>

      {/* Text Effects */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">Text Effects</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TiltCard>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  GradientText
                </div>
                <GradientText className="text-2xl font-bold">
                  Gradient Flow
                </GradientText>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Animated gradient with shimmer
                </p>
              </div>
            </TiltCard>

            <TiltCard>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  BlurText
                </div>
                <BlurText
                  text="Smooth Reveal"
                  className="text-2xl font-bold"
                  staggerDelay={30}
                />
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Character-by-character blur reveal
                </p>
              </div>
            </TiltCard>

            <TiltCard>
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
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Card Effects */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">Card Interactions</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <TiltCard glareEnable>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  TiltCard
                </div>
                <h3 className="mb-2 text-xl font-bold">3D Tilt Effect</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Move your mouse over this card to see the 3D tilt and glare
                  effect. Built with CSS transforms and real-time cursor tracking.
                </p>
              </div>
            </TiltCard>

            <SpotlightCard className="p-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                SpotlightCard
              </div>
              <h3 className="mb-2 text-xl font-bold">Spotlight Follow</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Hover to see a subtle gradient spotlight that follows your cursor.
                Perfect for highlighting interactive elements.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Background Effects */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">Background Effects</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <Aurora className="opacity-50" />
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
              <Particles quantity={50} staticity={80} color="#3b82f6" />
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-[var(--accent)]">
                    Particles
                  </div>
                  <div className="text-xl font-bold">Connected Network</div>
                </div>
              </div>
            </div>

            <div className="relative h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              <Hyperspeed />
              <div className="relative z-10 flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-[var(--accent)]">
                    Hyperspeed
                  </div>
                  <div className="text-xl font-bold">Star Field</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ripple Demo */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">Effects</h2>
          <div className="relative h-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <Ripple />
            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-2 text-sm font-semibold text-[var(--accent)]">
                  Ripple
                </div>
                <div className="text-3xl font-bold">Concentric Pulse</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Smooth ripple animation from center
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Component List */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-bold">All Components</h2>
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
          <p>© 2024 Pier. Built with Next.js, React, and Tailwind CSS.</p>
        </div>
      </footer>
    </main>
  );
}
