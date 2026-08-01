"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";

const ParticlePlayground = dynamic(() => import("@/components/lab/ParticlePlayground"), { ssr: false });
const ShaderMixer = dynamic(() => import("@/components/lab/ShaderMixer"), { ssr: false });
const FluidSim = dynamic(() => import("@/components/lab/FluidSim"), { ssr: false });
const PhysicsSandbox = dynamic(() => import("@/components/lab/PhysicsSandbox"), { ssr: false });
const FlowField = dynamic(() => import("@/components/lab/FlowField"), { ssr: false });
const Morph3D = dynamic(() => import("@/components/lab/Morph3D"), { ssr: false });

const GITHUB_BASE = "https://github.com/Jaaay50/pier-blog/blob/main/src/components/lab";

function DemoCard({
  title,
  desc,
  tech,
  viewSource,
  sourceFile,
  children,
  unavailable,
  tall = false,
}: {
  title: string;
  desc: string;
  tech: string;
  viewSource: string;
  sourceFile: string;
  children: React.ReactNode;
  unavailable?: string;
  tall?: boolean;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mb-2 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
            {tech}
          </span>
          <a
            href={`${GITHUB_BASE}/${sourceFile}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent)] transition-colors hover:underline"
          >
            {viewSource} →
          </a>
        </div>
      </div>
      <div className={`relative ${tall ? "h-[520px]" : "h-[420px]"} bg-black`}>
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

  // Physics sandbox state
  const [gravityOn, setGravityOn] = useState(true);
  const [ballCount, setBallCount] = useState(5);

  // Flow field state
  const [attract, setAttract] = useState(true);
  const [flowHue, setFlowHue] = useState(200);

  // Morph 3D state
  const [autoRotate, setAutoRotate] = useState(true);

  if (!quality) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        {["particles", "shader", "fluid", "physics", "flow", "morph"].map((key) => (
          <div
            key={key}
            className="h-[480px] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]"
          />
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

  const vs = t("viewSource");

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

  // 按主题色配置流体染料颜色
  const dyeColors: [number, number, number][] = isDark
    ? [[0.42, 0.61, 0.8], [0.55, 0.5, 0.8], [0.65, 0.87, 0.97]]
    : [[0.85, 0.47, 0.34], [0.83, 0.64, 0.5], [0.95, 0.75, 0.5]];

  return (
    <div className="space-y-8">
      {/* 旗舰：流体模拟（全宽） */}
      <DemoCard
        title={tDemos("fluid.title")}
        desc={tDemos("fluid.desc")}
        tech={tDemos("fluid.tech")}
        viewSource={vs}
        sourceFile="FluidSim.tsx"
        unavailable={unavailable}
        tall
      >
        {!unavailable && <FluidSim quality={quality} dyeColors={dyeColors} />}
      </DemoCard>

      {/* 2 列网格 */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* 物理沙盒 */}
        <DemoCard
          title={tDemos("physics.title")}
          desc={tDemos("physics.desc")}
          tech={tDemos("physics.tech")}
          viewSource={vs}
          sourceFile="PhysicsSandbox.tsx"
          unavailable={quality.reducedMotion ? t("reducedMotion") : undefined}
        >
          {!quality.reducedMotion && (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1">
                <PhysicsSandbox
                  quality={quality}
                  gravityOn={gravityOn}
                  onBallCount={setBallCount}
                />
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <span className="text-xs text-[var(--text-muted)]">
                  {ballCount} {locale === "zh" ? "个小球" : "balls"}
                </span>
                <button
                  type="button"
                  onClick={() => setGravityOn((g) => !g)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    gravityOn
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {locale === "zh" ? "重力" : "Gravity"} {gravityOn ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          )}
        </DemoCard>

        {/* 流场粒子 */}
        <DemoCard
          title={tDemos("flow.title")}
          desc={tDemos("flow.desc")}
          tech={tDemos("flow.tech")}
          viewSource={vs}
          sourceFile="FlowField.tsx"
          unavailable={quality.reducedMotion ? t("reducedMotion") : undefined}
        >
          {!quality.reducedMotion && (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                <FlowField quality={quality} attract={attract} hue={flowHue} />
              </div>
              <div className="flex items-center gap-3 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setAttract((a) => !a)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    attract
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {attract
                    ? locale === "zh" ? "鼠标吸引" : "Attract"
                    : locale === "zh" ? "鼠标排斥" : "Repel"}
                </button>
                <label className="flex flex-1 items-center gap-2 text-xs text-[var(--text-muted)]">
                  {locale === "zh" ? "色相" : "Hue"}
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={flowHue}
                    onChange={(e) => setFlowHue(Number(e.target.value))}
                    className="lab-slider flex-1"
                  />
                </label>
              </div>
            </div>
          )}
        </DemoCard>

        {/* Particle Playground */}
        <DemoCard
          title={tDemos("particles.title")}
          desc={tDemos("particles.desc")}
          tech={tDemos("particles.tech")}
          viewSource={vs}
          sourceFile="ParticlePlayground.tsx"
          unavailable={unavailable}
        >
          {!unavailable && (
            <ParticlePlayground quality={quality} labels={particleLabels} isDark={isDark} />
          )}
        </DemoCard>

        {/* 3D 形变 */}
        <DemoCard
          title={tDemos("morph.title")}
          desc={tDemos("morph.desc")}
          tech={tDemos("morph.tech")}
          viewSource={vs}
          sourceFile="Morph3D.tsx"
          unavailable={unavailable}
        >
          {!unavailable && (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1">
                <Morph3D quality={quality} autoRotate={autoRotate} isDark={isDark} />
              </div>
              <div className="flex items-center justify-end border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setAutoRotate((a) => !a)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    autoRotate
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {locale === "zh" ? "自动旋转" : "Auto Rotate"} {autoRotate ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          )}
        </DemoCard>
      </div>

      {/* Shader Mixer（全宽） */}
      <DemoCard
        title={tDemos("shader.title")}
        desc={tDemos("shader.desc")}
        tech={tDemos("shader.tech")}
        viewSource={vs}
        sourceFile="ShaderMixer.tsx"
        unavailable={unavailable}
        tall
      >
        {!unavailable && <ShaderMixer quality={quality} labels={shaderLabels} />}
      </DemoCard>
    </div>
  );
}
