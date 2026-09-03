"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";
import type { LabDemoId } from "./lab-demos";

const ParticlePlayground = dynamic(() => import("@/components/lab/ParticlePlayground"), { ssr: false });
const ShaderMixer = dynamic(() => import("@/components/lab/ShaderMixer"), { ssr: false });
const FluidSim = dynamic(() => import("@/components/lab/FluidSim"), { ssr: false });
const PhysicsSandbox = dynamic(() => import("@/components/lab/PhysicsSandbox"), { ssr: false });
const FlowField = dynamic(() => import("@/components/lab/FlowField"), { ssr: false });
const Morph3D = dynamic(() => import("@/components/lab/Morph3D"), { ssr: false });

export function LabDemoEnhance({ id }: { id: LabDemoId }) {
  const locale = useLocale();
  const t = useTranslations("lab");
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  const [gravityOn, setGravityOn] = useState(true);
  const [ballCount, setBallCount] = useState(5);
  const [attract, setAttract] = useState(true);
  const [flowHue, setFlowHue] = useState(200);
  const [autoRotate, setAutoRotate] = useState(true);

  if (!quality) return null;

  const isDark = resolvedTheme === "dark";
  const webglBlocked = !quality.enabled;
  const motionBlocked = quality.reducedMotion;
  const needsWebgl = id === "fluid" || id === "particles" || id === "shader" || id === "morph";
  const unavailable = needsWebgl && webglBlocked
    ? t("webglUnavailable")
    : motionBlocked && (id === "physics" || id === "flow")
      ? t("reducedMotion")
      : needsWebgl && motionBlocked
        ? t("reducedMotion")
        : undefined;

  if (unavailable) {
    return (
      <div className="flex h-full items-center justify-center bg-black/40 px-8 text-center text-sm text-[var(--text-muted)]">
        {unavailable}
      </div>
    );
  }

  const dyeColors: [number, number, number][] = isDark
    ? [[0.42, 0.61, 0.8], [0.55, 0.5, 0.8], [0.65, 0.87, 0.97]]
    : [[0.85, 0.47, 0.34], [0.83, 0.64, 0.5], [0.95, 0.75, 0.5]];

  if (id === "fluid") {
    return <FluidSim quality={quality} dyeColors={dyeColors} />;
  }

  if (id === "physics") {
    return (
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          <PhysicsSandbox quality={quality} gravityOn={gravityOn} onBallCount={setBallCount} />
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
    );
  }

  if (id === "flow") {
    return (
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
    );
  }

  if (id === "particles") {
    return (
      <ParticlePlayground
        quality={quality}
        isDark={isDark}
        labels={{
          count: locale === "zh" ? "粒子数量" : "Particle Count",
          spread: locale === "zh" ? "分布半径" : "Spread Radius",
          speed: locale === "zh" ? "运动速度" : "Motion Speed",
          hover: locale === "zh" ? "鼠标交互" : "Mouse Interaction",
          rotation: locale === "zh" ? "禁用自转" : "Disable Rotation",
        }}
      />
    );
  }

  if (id === "morph") {
    return (
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
    );
  }

  return (
    <ShaderMixer
      quality={quality}
      labels={{
        hue: locale === "zh" ? "色相" : "Hue",
        flow: locale === "zh" ? "流速" : "Flow Speed",
        turbulence: locale === "zh" ? "湍流" : "Turbulence",
        zoom: locale === "zh" ? "缩放" : "Zoom",
        randomize: locale === "zh" ? "随机参数" : "Randomize",
      }}
    />
  );
}
