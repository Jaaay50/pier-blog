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
 * 首页 Lab 引流带（Phase 10.5 液态玻璃重构）
 *
 * 结构：ShaderMixer canvasOnly 铺满 section 当流动幕布，
 * 右侧绝对定位一块离散玻璃板（.glass-card）悬浮其上。
 * 材质三层：跨浏览器磨砂 + 边缘光 → 对角 sheen → Chromium feDisplacementMap 折射。
 * WebGL 不可用时背景降为静态渐变，玻璃材质保留。
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
      className="relative mx-6 my-12 h-[420px] overflow-hidden rounded-2xl border-[1.5px] border-[var(--border-hover)] md:mx-auto md:h-[480px] md:max-w-6xl"
    >
      {/* 背景：ShaderMixer 铺满整个 section */}
      <div className="absolute inset-0">
        {mounted && quality.enabled && !quality.reducedMotion ? (
          <ShaderMixer
            quality={{ ...quality, tier: "medium" }}
            labels={shaderLabels}
            canvasOnly
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-card)] to-[var(--bg-elevated)]" />
        )}
      </div>

      {/* 右侧玻璃板：离散物体，浮在 shader 上方。
          定位/居中/hover 上浮全走 motion 内联 transform（right-6/md:right-12 只提供定位锚），
          避免 Tailwind translate class 与 motion 动画值互相覆盖 */}
      <motion.div
        className="glass-card group absolute right-6 top-1/2 z-10 w-[calc(100%-3rem)] max-w-sm rounded-2xl p-8 md:right-12"
        initial={{ opacity: 0, x: 32, y: "-50%" }}
        animate={inView ? { opacity: 1, x: 0, y: "-50%" } : {}}
        whileHover={{ y: "calc(-50% - 3px)", transition: { duration: 0.25, ease: "easeOut" } }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 内联 SVG 滤镜定义：Chromium 折射位移场（Safari/Firefox 由 @supports 降级忽略） */}
        <svg className="absolute" width="0" height="0" aria-hidden>
          <defs>
            <filter
              id="liquid-lens"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015 0.02"
                numOctaves="3"
                seed="42"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="30"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
            </filter>
          </defs>
        </svg>

        {/* 玻璃板内容 */}
        <div className="relative z-10 text-right">
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
        </div>
      </motion.div>
    </section>
  );
}
