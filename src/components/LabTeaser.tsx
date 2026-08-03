"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";
import { TransitionLink } from "@/components/TransitionLink";
import { MagneticWrapper } from "@/components/MagneticWrapper";

const ShaderMixer = dynamic(() => import("@/components/lab/ShaderMixer"), {
  ssr: false,
});

/**
 * 首页 Lab 引流带（Phase 9.2）
 *
 * 用低分辨率 ShaderMixer 预览当幕布，右侧文案 + CTA。
 * 视口外暂停（ShaderMixer 内部走 observeRenderGate），
 * WebGL 不可用时降为静态渐变背景。
 */
interface LabTeaserProps {
  label: string;
  enterLab: string;
}

export function LabTeaser({ label, enterLab }: LabTeaserProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const quality = useWebGLQuality();
  const mounted = quality !== null;

  const shaderLabels = {
    hue: "Hue",
    flow: "Flow",
    turbulence: "Turbulence",
    zoom: "Zoom",
    randomize: "Randomize",
  };

  return (
    <section
      ref={ref}
      className="lab-teaser-card group relative mx-6 my-12 overflow-hidden rounded-2xl border-[1.5px] border-[var(--border-hover)] md:mx-auto md:max-w-6xl"
    >
      {/* 背景：ShaderMixer 幕布（pointer-events-none 让文字可选） */}
      <div className="pointer-events-none absolute inset-0">
        {mounted && quality.enabled && !quality.reducedMotion ? (
          <ShaderMixer quality={{ ...quality, tier: "medium" }} labels={shaderLabels} />
        ) : (
          <div className="h-full bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-card)] to-[var(--bg-elevated)]" />
        )}
        {/* 玻璃态遮罩：磨砂渐变 + backdrop-blur，透出后方 Shader 流动 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--bg-primary)]/50 to-[var(--bg-primary)]/85 backdrop-blur-2xl" />
        {/* 文字区反光 highlight（模拟玻璃表面） */}
        <div className="absolute bottom-0 right-0 top-0 w-2/5 bg-gradient-to-l from-white/[0.02] to-transparent dark:from-white/[0.01]" />
      </div>

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-end justify-center px-8 py-16 md:px-12 md:py-20">
        <motion.div
          className="max-w-sm text-right"
          initial={{ opacity: 0, x: 32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Lab
          </p>
          <p className="mb-8 text-sm leading-relaxed text-[var(--text-primary)]">
            {label}
          </p>
          <MagneticWrapper strength={0.2}>
            <TransitionLink
              href="/lab"
              className="lab-teaser-cta inline-block rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              {enterLab} →
            </TransitionLink>
          </MagneticWrapper>
        </motion.div>
      </div>
    </section>
  );
}
