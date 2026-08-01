"use client";

import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";

const ParticlePlayground = dynamic(
  () => import("@/components/lab/ParticlePlayground"),
  { ssr: false }
);
const ShaderMixer = dynamic(() => import("@/components/lab/ShaderMixer"), {
  ssr: false,
});

function DemoCard({
  title,
  desc,
  tech,
  viewSource,
  sourceUrl,
  children,
  unavailable,
}: {
  title: string;
  desc: string;
  tech: string;
  viewSource: string;
  sourceUrl: string;
  children: React.ReactNode;
  unavailable?: string;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="mb-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {desc}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{tech}</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent)] transition-colors hover:underline"
          >
            {viewSource} →
          </a>
        </div>
      </div>
      <div className="relative h-[420px]">
        {unavailable ? (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-elevated)] px-8 text-center text-sm text-[var(--text-muted)]">
            {unavailable}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function LabClientContent() {
  const t = useTranslations("lab");
  const locale = useLocale();
  const tDemos = (key: string) => t(`demos.${key}`);
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();

  if (!quality) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        {["particles", "shader"].map((key) => (
          <DemoCard
            key={key}
            title={tDemos(`${key}.title`)}
            desc={tDemos(`${key}.desc`)}
            tech={tDemos(`${key}.tech`)}
            viewSource={t("viewSource")}
            sourceUrl={`https://github.com/Jaaay50/pier-blog/blob/main/src/components/lab/${
              key === "particles" ? "ParticlePlayground" : "ShaderMixer"
            }.tsx`}
            unavailable=""
          >
            <div className="h-full animate-pulse bg-[var(--bg-secondary)]" />
          </DemoCard>
        ))}
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";
  const unavailable = !quality.enabled
    ? t("webglUnavailable")
    : quality.reducedMotion
      ? t("reducedMotion")
      : undefined;

  const particleLabels = {
    count: locale === "zh" ? "粒子数量" : "Particle Count",
    spread: locale === "zh" ? "分布半径" : "Spread Radius",
    speed: locale === "zh" ? "运动速度" : "Motion Speed",
    hover: locale === "zh" ? "鼠标交互" : "Mouse Interaction",
    rotation: locale === "zh" ? "禁用自转" : "Disable Rotation",
  };

  const shaderLabels = {
    hue: locale === "zh" ? "色相" : "Hue",
    flow: locale === "zh" ? "流速" : "Flow Speed",
    turbulence: locale === "zh" ? "湍流" : "Turbulence",
    zoom: locale === "zh" ? "缩放" : "Zoom",
    randomize: locale === "zh" ? "随机参数" : "Randomize",
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <DemoCard
        title={tDemos("particles.title")}
        desc={tDemos("particles.desc")}
        tech={tDemos("particles.tech")}
        viewSource={t("viewSource")}
        sourceUrl="https://github.com/Jaaay50/pier-blog/blob/main/src/components/lab/ParticlePlayground.tsx"
        unavailable={unavailable}
      >
        {!unavailable && (
          <ParticlePlayground
            quality={quality}
            labels={particleLabels}
            isDark={isDark}
          />
        )}
      </DemoCard>

      <DemoCard
        title={tDemos("shader.title")}
        desc={tDemos("shader.desc")}
        tech={tDemos("shader.tech")}
        viewSource={t("viewSource")}
        sourceUrl="https://github.com/Jaaay50/pier-blog/blob/main/src/components/lab/ShaderMixer.tsx"
        unavailable={unavailable}
      >
        {!unavailable && <ShaderMixer quality={quality} labels={shaderLabels} />}
      </DemoCard>
    </div>
  );
}
