"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";
import { TransitionLink } from "@/components/TransitionLink";
import { MagneticWrapper } from "@/components/MagneticWrapper";

const ShaderMixer = dynamic(() => import("@/components/lab/ShaderMixer"), {
  ssr: false,
});

/**
 * 首页 Lab 引流带（Phase 10.6 shader 内折射重构）
 *
 * 结构：ShaderMixer canvasOnly 铺满 section 当流动幕布，
 * 右侧绝对定位一块离散玻璃板（.glass-card）悬浮其上。
 * 折射已下沉到 ShaderMixer GLSL（圆角矩形 SDF 边缘透镜 + 色差），
 * DOM 层只保留原生 blur 磨砂与边缘光。
 * WebGL 不可用时背景降为静态渐变，玻璃材质保留。
 */
interface LabTeaserProps {
  label: string;
  enterLab: string;
}

export function LabTeaser({ label, enterLab }: LabTeaserProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const quality = useWebGLQuality();
  const mounted = quality !== null;

  // 透镜矩形（canvas UV 空间），由玻璃板与背景容器的实测矩形换算。
  // strength 克制档：边缘最大位移 ≈ strength × canvas 渲染高度（像素）。
  const LENS_STRENGTH = 0.046;
  const [lens, setLens] = useState<{
    rect: [number, number, number, number];
    radius: number;
    strength: number;
  } | null>(null);

  // 用 getBoundingClientRect 相对位置换算 UV；纯比例运算，与 DPR / renderScale 无关
  const measureLens = useCallback(() => {
    const host = bgRef.current;
    const glass = glassRef.current;
    if (!host || !glass) return;
    const hr = host.getBoundingClientRect();
    const gr = glass.getBoundingClientRect();
    if (hr.width === 0 || hr.height === 0) return;
    const relX = gr.left - hr.left;
    const relTop = gr.top - hr.top;
    const uvX = relX / hr.width;
    // GL y 向上：矩形左下角 = 1 - (顶偏移 + 高)/host 高
    const uvY = 1 - (relTop + gr.height) / hr.height;
    const uvW = gr.width / hr.width;
    const uvH = gr.height / hr.height;
    // rounded-2xl = 16px CSS；SDF 在各向同性空间以 canvas 高度为单位
    const radius = 16 / hr.height;
    setLens({ rect: [uvX, uvY, uvW, uvH], radius, strength: LENS_STRENGTH });
  }, []);

  // 首测 + 监听两者尺寸变化（滚动不重算：同属一 section，相对位置固定）
  useEffect(() => {
    measureLens();
    const host = bgRef.current;
    const glass = glassRef.current;
    if (!host || !glass) return;
    const ro = new ResizeObserver(() => measureLens());
    ro.observe(host);
    ro.observe(glass);
    return () => ro.disconnect();
  }, [measureLens, mounted]);

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
      className="relative my-12 h-[420px] overflow-hidden rounded-2xl border-[1.5px] border-[var(--border-hover)] md:h-[480px]"
      style={{
        maxWidth: '1280px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 'max(clamp(1.5rem, 3vw, 2.5rem), env(safe-area-inset-left))',
        paddingRight: 'max(clamp(1.5rem, 3vw, 2.5rem), env(safe-area-inset-right))'
      }}
    >
      {/* 背景：ShaderMixer 铺满整个 section */}
      <div ref={bgRef} className="absolute inset-0">
        {mounted && quality.enabled && !quality.reducedMotion ? (
          <ShaderMixer
            quality={{ ...quality, tier: "medium" }}
            labels={shaderLabels}
            canvasOnly
            lens={lens ?? undefined}
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-card)] to-[var(--bg-elevated)]" />
        )}
      </div>

      {/* 右侧玻璃板：离散物体，浮在 shader 上方。
          定位/居中/hover 上浮全走 motion 内联 transform（right-6/md:right-12 只提供定位锚），
          避免 Tailwind translate class 与 motion 动画值互相覆盖 */}
      <motion.div
        ref={glassRef}
        className="glass-card group absolute right-6 top-1/2 z-10 w-[calc(100%-3rem)] max-w-sm rounded-2xl p-8 md:right-12"
        initial={{ opacity: 0, x: 32, y: "-50%" }}
        animate={inView ? { opacity: 1, x: 0, y: "-50%" } : {}}
        whileHover={{ y: "calc(-50% - 3px)", transition: { duration: 0.25, ease: "easeOut" } }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
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
