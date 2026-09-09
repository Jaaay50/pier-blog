"use client";

import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";
import { useLocale } from "next-intl";
import { StaticHeroFallback } from "@/components/StaticHeroFallback";
import { FloatingShapes } from "@/components/FloatingShapes";
import ShinyText from "@/components/reactbits/ShinyText";
import { useWebGLQuality } from "@/lib/webgl";

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

// Keep the homepage palette local: changing shared text tokens would recolor the title.
const LIGHT_HERO_COLORS = ["#d97757", "#e8c4a0", "#c6613f"];

function LightHeroAtmosphere({ enabled }: { enabled: boolean }) {
  const [ready, setReady] = useState(false);

  return (
    <div
      data-theme="light"
      data-ready={enabled && ready}
      className="hero-light-atmosphere absolute inset-0"
    >
      {/* The CSS-selected fallback also covers SSR, chunk loading and GPU failure. */}
      <div className="hero-light-static absolute inset-0">
        <StaticHeroFallback isDark={false} />
      </div>
      {enabled && (
        <div className="hero-light-aurora absolute inset-0">
          <Aurora
            lightMode
            backgroundColor="#faf9f5"
            colorStops={LIGHT_HERO_COLORS}
            speed={1}
            amplitude={1.2}
            blend={0.5}
            onReadyChange={setReady}
          />
        </div>
      )}
      <div className="hero-light-content-veil absolute inset-0" />
    </div>
  );
}

interface ImmersiveHeroProps {
  /** 测试可覆写；页面不传，避免 SSR HTML / messages / RSC 各写一遍连续标题。 */
  title?: string;
  subtitle: string;
}

/** 方案 D：只强调「全栈的栈 / 栈桥的栈」里作为双关落点的那个「栈」。 */
const STACK_PUN_TITLE = "全栈的栈，也是栈桥的栈";
const EN_TITLE = "A pier has to hold at both ends";
const STACK_PUN_INDICES = new Set([3, 10]);
/** 全角标点墨水偏左，单独成盒后右侧会空出大半个字宽。 */
const CJK_PUNCT = /[，。、；：！？]/;

function TitleGlyphs({ title, isZh }: { title: string; isZh: boolean }) {
  const highlight = title === STACK_PUN_TITLE ? STACK_PUN_INDICES : null;
  const words = isZh ? [title] : title.split(" ");
  let i = -1;
  return words.map((word, wi) => {
    const glyphs = Array.from(word).map((char) => {
      i += 1;
      const idx = i;
      const glyphClass = [
        "inline-block",
        highlight?.has(idx) ? "hero-stack-glyph" : "",
        CJK_PUNCT.test(char) ? "hero-cjk-punct" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return <span key={idx} data-ptchar className={glyphClass}>{char}</span>;
    });
    // 中文字形直接参与 flex 换行；英文以单词为不可拆分的采样组。
    return isZh ? glyphs : (
      <span key={wi} className="inline-flex whitespace-nowrap">
        {glyphs}
        {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
      </span>
    );
  });
}

/**
 * 全屏沉浸式 Hero
 * - 深色：Galaxy 星空 + 粒子重组标题
 * - 浅色：Aurora 暖极光 + 粒子重组标题
 * - 降级：静态 DOM 标题始终可读，首帧绘制成功后才交给粒子
 */
export function ImmersiveHero({
  title,
  subtitle,
}: ImmersiveHeroProps) {
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  const locale = useLocale();
  const isZh = locale === "zh";
  const resolvedTitle = title ?? (isZh ? STACK_PUN_TITLE : EN_TITLE);
  const mounted = quality !== null;
  const { scrollY } = useScroll();

  const contentY = useTransform(scrollY, [0, 600], [0, -120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const bgScale = useTransform(scrollY, [0, 800], [1, 1.15]);

  const isDark = mounted && resolvedTheme === "dark";

  // Phase 9.1 粒子标题门控
  const canUseParticles = mounted && quality && quality.enabled;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [particleState, setParticleState] = useState({
    title: resolvedTitle, quality, ready: false, failed: false,
  });
  // 在提交新标题/设备配置前撤销旧就绪状态，避免 effect 执行前出现空白帧。
  if (particleState.title !== resolvedTitle || particleState.quality !== quality) {
    setParticleState({ title: resolvedTitle, quality, ready: false, failed: false });
  }
  const particleMode = !!canUseParticles && !particleState.failed;
  const particleReady = particleMode && particleState.ready;
  const updateParticles = (update: { ready: boolean; failed?: boolean }) => {
    setParticleState((current) =>
      current.title === resolvedTitle && current.quality === quality
        ? { ...current, ...update }
        : current,
    );
  };

  return (
    <section className="hero-immersive relative h-screen w-full">
      {/* 光场：100vh 画布 + 向下延伸的 CSS 尾段，统一 mask 融入 ambient */}
      <div className="hero-atmosphere" aria-hidden="true">
        <motion.div className="hero-atmosphere-field" style={{ scale: bgScale }}>
          {!mounted || !quality ? (
            <LightHeroAtmosphere key="light-static" enabled={false} />
          ) : isDark && !quality.enabled ? (
            <StaticHeroFallback isDark={isDark} />
          ) : isDark ? (
            <div className="absolute inset-0 opacity-[0.22]">
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
            <LightHeroAtmosphere
              key={quality.enabled ? "light-animated" : "light-static"}
              enabled={quality.enabled}
            />
          )}
        </motion.div>
        <div className="hero-atmosphere-tail" />
      </div>

      {/* 前景浮动几何层：裁在首屏内，不进入过渡带 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {mounted && <FloatingShapes />}
      </div>

      {/* 内容 */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        {/* 主标题：可访问名只来自 aria-label；字形层仅供视觉/采样，不进辅助技术。 */}
        <h1
          aria-label={resolvedTitle}
          className="font-display relative mb-10 flex flex-wrap justify-center text-[clamp(2.75rem,8.5vw,8rem)] leading-[1.05] tracking-tight text-[var(--text-primary)]"
        >
          {/* SSR、水合和降级共用同一锚点；仅成功绘制信号可以隐藏它。 */}
          <span
            ref={anchorRef}
            aria-hidden="true"
            tabIndex={-1}
            data-particles-ready={particleReady}
            className="hero-title-ssr flex flex-wrap justify-center"
            style={{ opacity: particleReady ? 0 : 1 }}
          >
            <TitleGlyphs title={resolvedTitle} isZh={isZh} />
          </span>
          {particleMode && quality && (
            <ParticleTitle
              title={resolvedTitle}
              anchorRef={anchorRef}
              isDark={isDark}
              quality={quality}
              onReadyChange={(ready) => updateParticles({ ready })}
              onFail={() => updateParticles({ ready: false, failed: true })}
            />
          )}
        </h1>

        {/* 副标题：中文无空格可断，max-w-2xl 会因多一个字折行。 */}
        <div
          className={`hero-subtitle mb-12 ${isZh ? "max-w-[52rem]" : "max-w-2xl"}`}
        >
          <ShinyText
            text={subtitle}
            speed={3}
            color={isDark ? "#a1a1a1" : "#5e5d59"}
            shineColor={isDark ? "#e0ecff" : "#d97757"}
            className={`text-base leading-relaxed md:text-lg ${isZh ? "" : "tracking-wide"}`}
          />
        </div>
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
