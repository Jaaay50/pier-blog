"use client";

import { useTheme } from "next-themes";
import { ReactNode, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";
import { useLocale } from "next-intl";
import { StaticHeroFallback } from "@/components/StaticHeroFallback";
import { FloatingShapes } from "@/components/FloatingShapes";
import { useWebGLQuality } from "@/lib/webgl";
import ShinyText from "@/components/reactbits/ShinyText";

// WebGL 背景懒加载
const Galaxy = dynamic(() => import("@/components/reactbits/Galaxy"), {
  ssr: false,
});
const Aurora = dynamic(() => import("@/components/reactbits/Aurora"), {
  ssr: false,
});
// Phase 9.1 粒子标题
const ParticleTitle = dynamic(
  () => import("@/components/webgl/ParticleTitle"),
  { ssr: false }
);

interface ImmersiveHeroProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/**
 * 全屏沉浸式 Hero
 * - 深色：Galaxy 星空 + 粒子重组标题
 * - 浅色：Aurora 暖极光 + 粒子重组标题
 * - 降级：逐字上浮+去模糊（原有动效保留为降级路径）
 */
export function ImmersiveHero({
  title,
  subtitle,
  children,
}: ImmersiveHeroProps) {
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  const locale = useLocale();
  const mounted = quality !== null;
  const { scrollY } = useScroll();

  const contentY = useTransform(scrollY, [0, 600], [0, -120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const bgScale = useTransform(scrollY, [0, 800], [1, 1.15]);

  const isDark = mounted && resolvedTheme === "dark";
  const isZh = locale === "zh";
  // 逐字揭示：中文每字一个单元、英文每词整体不断行，节奏一致
  const words = title.split(" ");

  // Phase 9.1 粒子标题门控
  const canUseParticles = mounted && quality && quality.enabled;
  const anchorRef = useRef<HTMLSpanElement>(null);
  // 粒子路径失败（采样/context 创建失败）时回退 DOM 标题
  const [particleFailed, setParticleFailed] = useState(false);
  const particleMode = !!canUseParticles && !particleFailed;

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* 全屏背景 */}
      <motion.div className="absolute inset-0" style={{ scale: bgScale }}>
        {!mounted || !quality ? (
          <div className="absolute inset-0 bg-[var(--bg-primary)]" />
        ) : !quality.enabled ? (
          <StaticHeroFallback isDark={isDark} />
        ) : isDark ? (
          <div className="absolute inset-0 opacity-45">
            <Galaxy
              mouseInteraction={quality.mouseInteraction}
              mouseRepulsion={quality.mouseInteraction}
              repulsionStrength={2.5}
              density={2 * quality.particleMultiplier}
              starSpeed={0.4}
              glowIntensity={0.5}
              twinkleIntensity={0.5}
              hueShift={220}
              saturation={0.4}
              rotationSpeed={0.05}
              dpr={quality.dpr}
            />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-40">
            <Aurora
              colorStops={["#d97757", "#e8c4a0", "#c6613f"]}
              amplitude={1.2}
              blend={0.65}
            />
          </div>
        )}
      </motion.div>

      {/* 前景浮动几何层 */}
      {mounted && <FloatingShapes />}

      {/* 底部渐隐 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />

      {/* 内容 */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        {/* 主标题：粒子重组（WebGL 可用）或逐字上浮降级 */}
        <h1 className="font-display relative mb-10 flex flex-wrap justify-center text-[clamp(2.75rem,8.5vw,8rem)] leading-[1.05] tracking-tight text-[var(--text-primary)]">
          <span className="sr-only">{title}</span>
          {!mounted ? (
            <span aria-hidden="true">{title}</span>
          ) : (
            <>
              {/* DOM 标题层：粒子模式下立即隐藏（仅作采样锚点），降级/失败时执行逐字动画 */}
              <span
                key={particleMode ? "particle" : "fallback"}
                ref={anchorRef}
                aria-hidden="true"
                className={`flex flex-wrap justify-center ${
                  particleMode ? "opacity-0" : "opacity-100"
                }`}
              >
                {(() => {
                  let i = -1;
                  return words.map((word, wi) => (
                    <span key={wi} className="inline-flex whitespace-nowrap">
                      {Array.from(word).map((char) => {
                        i += 1;
                        const idx = i;
                        return particleMode ? (
                          <span key={idx} data-ptchar className="inline-block">
                            {char}
                          </span>
                        ) : (
                          <motion.span
                            key={idx}
                            data-ptchar
                            className="inline-block"
                            initial={{ opacity: 0, y: 44, filter: "blur(12px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{
                              duration: 0.7,
                              delay: 0.25 + idx * (isZh ? 0.08 : 0.055),
                              ease: [0.22, 1, 0.36, 1],
                            }}
                          >
                            {char}
                          </motion.span>
                        );
                      })}
                      {wi < words.length - 1 && (
                        <span className="inline-block">&nbsp;</span>
                      )}
                    </span>
                  ));
                })()}
              </span>
              {/* 粒子层：直接从碎裂态聚合成字；失败时回退 DOM 标题 */}
              {canUseParticles && !particleFailed && (
                <ParticleTitle
                  title={title}
                  anchorRef={anchorRef}
                  isDark={isDark}
                  quality={quality}
                  onFail={() => setParticleFailed(true)}
                />
              )}
            </>
          )}
        </h1>

        {/* 副标题 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.2 }}
          className="mb-12 max-w-xl"
        >
          <ShinyText
            text={subtitle}
            speed={3}
            color={isDark ? "#a1a1a1" : "#5e5d59"}
            shineColor={isDark ? "#e0ecff" : "#d97757"}
            className="text-base leading-relaxed tracking-wide md:text-lg"
          />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* 滚动提示 */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--text-muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        style={{ opacity: contentOpacity }}
      >
        <motion.svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
