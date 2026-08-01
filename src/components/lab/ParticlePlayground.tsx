"use client";

import { useState } from "react";
import Particles from "@/components/reactbits/Particles";
import { type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — Particle Playground
 *
 * 复用现有 Particles 组件，暴露关键参数滑杆：
 * - particleCount: 粒子数量
 * - particleSpread: 分布半径
 * - speed: 运动速度
 * - particleHoverFactor: 鼠标交互强度
 * - disableRotation: 自转开关
 */

interface ParticlePlaygroundProps {
  quality: WebGLQuality;
  labels: {
    count: string;
    spread: string;
    speed: string;
    hover: string;
    rotation: string;
  };
  isDark: boolean;
}

const DEFAULTS = {
  count: 400,
  spread: 10,
  speed: 0.15,
  hover: 1.5,
  rotation: false,
};

export default function ParticlePlayground({
  quality,
  labels,
  isDark,
}: ParticlePlaygroundProps) {
  const [params, setParams] = useState(DEFAULTS);

  const colors = isDark
    ? ["#6a9bcc", "#8b7fcc", "#ffffff"]
    : ["#d97757", "#d4a27f", "#3d3d3a"];

  const sliders: {
    key: keyof typeof params;
    label: string;
    min: number;
    max: number;
    step: number;
    type: "range" | "checkbox";
  }[] = [
    { key: "count", label: labels.count, min: 100, max: 800, step: 50, type: "range" },
    { key: "spread", label: labels.spread, min: 5, max: 20, step: 1, type: "range" },
    { key: "speed", label: labels.speed, min: 0.05, max: 0.5, step: 0.05, type: "range" },
    { key: "hover", label: labels.hover, min: 0, max: 3, step: 0.25, type: "range" },
    { key: "rotation", label: labels.rotation, min: 0, max: 1, step: 1, type: "checkbox" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)]">
        <Particles
          particleCount={Math.round(params.count * quality.particleMultiplier)}
          particleSpread={params.spread}
          speed={params.speed}
          particleColors={colors}
          moveParticlesOnHover={quality.mouseInteraction}
          particleHoverFactor={params.hover}
          alphaParticles
          particleBaseSize={80}
          sizeRandomness={1}
          disableRotation={params.rotation}
          pixelRatio={quality.dpr}
          className="absolute inset-0"
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg-card)] p-4">
        {sliders.map((s) =>
          s.type === "checkbox" ? (
            <label
              key={s.key}
              className="flex cursor-pointer items-center justify-between text-sm"
            >
              <span className="text-[var(--text-secondary)]">{s.label}</span>
              <input
                type="checkbox"
                checked={params[s.key] as boolean}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    [s.key]: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
          ) : (
            <label key={s.key} className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                {s.label}
                <span className="font-mono tabular-nums">
                  {(params[s.key] as number).toFixed(s.step < 1 ? 2 : 0)}
                </span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key] as number}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    [s.key]: parseFloat(e.target.value),
                  }))
                }
                className="lab-slider"
              />
            </label>
          )
        )}
      </div>
    </div>
  );
}
