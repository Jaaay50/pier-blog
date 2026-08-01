"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Geometry } from "ogl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Phase 9.1 — Hero 粒子重组标题
 *
 * 管线：DOM 标题（SSR 可见）→ 字体就绪后逐字采样 →
 * canvas 淡入接管（DOM 标题淡出）→ 溶解成星尘 → 重聚成字 →
 * 待机呼吸 + 鼠标斥力 + 滚动吹散。
 *
 * - 单 gl.POINTS mesh，morph 全在 vertex shader（CPU 只喂 uniform）
 * - 采样直接读 DOM 逐字 span 的实际 rect，换行/字距/居中天然与 DOM 一致
 * - 主题切换只更新 3 个颜色 uniform 与混合模式，不重采样
 * - 视口外暂停（observeRenderGate）；仅宽度变化时重建（忽略移动端地址栏高度抖动）
 */

const vertex = /* glsl */ `
  attribute vec2 aStart;
  attribute vec2 aTarget;
  attribute vec4 aSeed;

  uniform vec2 uResolution;
  uniform float uProgress;
  uniform float uScatter;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uMouseActive;
  uniform float uDpr;
  uniform vec2 uBoundsX;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // 每粒子 stagger 的聚合进度
    float S = 0.45;
    float p = clamp(uProgress * (1.0 + S) - aSeed.x * S, 0.0, 1.0);
    p = p * p * (3.0 - 2.0 * p);
    float eff = p * (1.0 - uScatter);

    float t = uTime;
    vec2 chaosDrift = vec2(
      sin(t * 0.35 + aSeed.y * 6.2831),
      cos(t * 0.30 + aSeed.y * 12.566)
    ) * 26.0;
    vec2 breathe = vec2(
      sin(t * 0.9 + aSeed.y * 6.2831),
      cos(t * 0.8 + aSeed.y * 9.4247)
    ) * 1.6;

    vec2 pos = mix(aStart + chaosDrift, aTarget + breathe, eff);

    // 鼠标斥力（指数衰减，无奇点）
    vec2 dm = pos - uMouse;
    float d = length(dm);
    if (d > 0.001) {
      pos += (dm / d) * exp(-d / 90.0) * 70.0 * uMouseActive;
    }

    vec2 clip = (pos / uResolution) * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = (1.6 + aSeed.z * 2.2) * uDpr * mix(1.25, 1.0, eff);

    // 按目标 x 位置三色渐变 + 少量抖动
    float tx = clamp((aTarget.x - uBoundsX.x) / max(uBoundsX.y - uBoundsX.x, 1.0), 0.0, 1.0);
    tx = clamp(tx + (aSeed.w - 0.5) * 0.18, 0.0, 1.0);
    vColor = tx < 0.5
      ? mix(uColor1, uColor2, tx * 2.0)
      : mix(uColor2, uColor3, tx * 2.0 - 1.0);

    float twinkle = 0.8 + 0.2 * sin(t * (1.5 + aSeed.z) + aSeed.y * 6.2831);
    vAlpha = mix(0.35, 0.95, eff) * twinkle * mix(1.0, 0.05, uScatter);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.12, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const int = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(int)) return [1, 1, 1];
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function readThemeColors(): [number, number, number][] {
  const style = getComputedStyle(document.documentElement);
  return [
    hexToRgb(style.getPropertyValue("--gradient-text-1") || "#d97757"),
    hexToRgb(style.getPropertyValue("--gradient-text-2") || "#c6613f"),
    hexToRgb(style.getPropertyValue("--gradient-text-3") || "#d4a27f"),
  ];
}

interface SampleResult {
  targets: Float32Array;
  count: number;
  minX: number;
  maxX: number;
}

/** 逐字 span 采样：在 offscreen canvas 按 DOM 实际 rect 复刻文字并提取墨水像素 */
function sampleText(
  anchor: HTMLElement,
  host: HTMLElement,
  targetCount: number
): SampleResult | null {
  const hostRect = host.getBoundingClientRect();
  const spans = anchor.querySelectorAll<HTMLElement>("[data-ptchar]");
  if (!spans.length || hostRect.width < 10 || hostRect.height < 10) return null;

  const w = Math.round(hostRect.width);
  const h = Math.round(hostRect.height);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const style = getComputedStyle(spans[0]);
  const fontSize = parseFloat(style.fontSize);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  // 垂直居中对齐 span rect：避免 fontBoundingBoxAscent 在 serif 字体下
  // 偏大导致文字画出 canvas 底部被裁（曾造成只显示上半部分）
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  spans.forEach((s) => {
    const r = s.getBoundingClientRect();
    ctx.fillText(
      s.textContent || "",
      r.left - hostRect.left,
      r.top - hostRect.top + r.height / 2
    );
  });

  const img = ctx.getImageData(0, 0, w, h).data;
  let ink = 0;
  for (let i = 3; i < img.length; i += 4) {
    if (img[i] > 120) ink++;
  }
  if (ink < 50) return null;

  const step = Math.max(1, Math.round(Math.sqrt(ink / targetCount)));
  const targets: number[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (img[(y * w + x) * 4 + 3] > 120) {
        const jx = x + (Math.random() - 0.5) * step;
        const jy = y + (Math.random() - 0.5) * step;
        targets.push(jx, jy);
        if (jx < minX) minX = jx;
        if (jx > maxX) maxX = jx;
      }
    }
  }
  const count = targets.length / 2;
  if (count < 100) return null;
  return { targets: new Float32Array(targets), count, minX, maxX };
}

type Phase = "boot" | "swap" | "shatter" | "converge" | "idle";

const SWAP_MS = 280;
const SHATTER_MS = 520;
const CONVERGE_MS = 1650;

interface ParticleTitleProps {
  /** 标题文本（变化时整体重建重采样） */
  title: string;
  /** 逐字 span 容器（aria-hidden 的可见 DOM 标题层） */
  anchorRef: RefObject<HTMLSpanElement | null>;
  isDark: boolean;
  quality: WebGLQuality;
  /** canvas 接管瞬间回调（父组件淡出 DOM 标题） */
  onTakeover: () => void;
}

export default function ParticleTitle({
  title,
  anchorRef,
  isDark,
  quality,
  onTakeover,
}: ParticleTitleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [rebuildTick, setRebuildTick] = useState(0);
  const isDarkRef = useRef(isDark);
  const introDoneRef = useRef(false);
  const glStateRef = useRef<{
    gl: WebGL2RenderingContext | WebGLRenderingContext;
    program: Program;
  } | null>(null);
  const onTakeoverRef = useRef(onTakeover);

  // 同步最新值到 ref（不触发重建）
  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);
  useEffect(() => { onTakeoverRef.current = onTakeover; }, [onTakeover]);

  // 主题切换：只更新颜色 uniform 与混合模式，不重建
  useEffect(() => {
    const state = glStateRef.current;
    if (!state) return;
    const [c1, c2, c3] = readThemeColors();
    state.program.uniforms.uColor1.value = c1;
    state.program.uniforms.uColor2.value = c2;
    state.program.uniforms.uColor3.value = c3;
    const gl = state.gl;
    gl.blendFunc(gl.SRC_ALPHA, isDark ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  }, [isDark]);

  useEffect(() => {
    const host = hostRef.current;
    const anchor = anchorRef.current;
    if (!host || !anchor) return;

    let disposed = false;
    let animateId: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;
    let phase: Phase = "boot";
    let phaseT0 = 0;
    let stopGate: (() => void) | null = null;
    let gateActive = true;
    let renderer: Renderer | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = window.innerWidth;

    const targetMouse = { x: -9999, y: -9999 };
    const smoothMouse = { x: -9999, y: -9999 };
    let targetActive = 0;
    let smoothActive = 0;

    const targetCount = Math.min(
      12000,
      Math.round(9000 * quality.particleMultiplier)
    );

    const boot = async () => {
      // 字体门控：display 字体就绪后才采样（3s 超时兜底：保持 DOM 标题）
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {
        /* fonts API 异常时直接尝试采样 */
      }
      if (disposed) return;

      const sample = sampleText(anchor, host, targetCount);
      if (!sample) return; // 采样失败：DOM 标题保持可见，静默放弃

      const { targets, count, minX, maxX } = sample;
      const hostRect = host.getBoundingClientRect();
      const w = Math.round(hostRect.width);
      const h = Math.round(hostRect.height);

      // 混沌起点：铺满全屏并向外扩（部分从屏幕外飘入）
      const starts = new Float32Array(count * 2);
      const seeds = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        starts[i * 2] = w * 0.5 + (Math.random() - 0.5) * w * 1.7;
        starts[i * 2 + 1] = h * 0.5 + (Math.random() - 0.5) * h * 1.7;
        seeds[i * 4] = Math.random();
        seeds[i * 4 + 1] = Math.random();
        seeds[i * 4 + 2] = Math.random();
        seeds[i * 4 + 3] = Math.random();
      }

      let localRenderer: Renderer;
      try {
        localRenderer = new Renderer({
          alpha: true,
          depth: false,
          dpr: quality.dpr,
          premultipliedAlpha: false,
        });
      } catch {
        return; // context 创建失败：保持 DOM 标题
      }
      if (disposed) return;
      renderer = localRenderer;
      const gl = localRenderer.gl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, isDarkRef.current ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      localRenderer.setSize(w, h);

      const geometry = new Geometry(gl, {
        aStart: { size: 2, data: starts },
        aTarget: { size: 2, data: targets },
        aSeed: { size: 4, data: seeds },
      });

      const [c1, c2, c3] = readThemeColors();
      const program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        depthTest: false,
        uniforms: {
          uResolution: { value: [w, h] },
          uProgress: { value: introDoneRef.current ? 1 : 0 },
          uScatter: { value: 0 },
          uTime: { value: 0 },
          uMouse: { value: [smoothMouse.x, smoothMouse.y] },
          uMouseActive: { value: 0 },
          uDpr: { value: quality.dpr },
          uBoundsX: { value: [minX, maxX] },
          uColor1: { value: c1 },
          uColor2: { value: c2 },
          uColor3: { value: c3 },
        },
      });
      glStateRef.current = { gl, program };

      const mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      host.appendChild(gl.canvas);

      const easeOutQuad = (k: number) => 1 - (1 - k) * (1 - k);

      const update = (t: number) => {
        animateId = requestAnimationFrame(update);
        if (lastTime !== null) elapsed += t - lastTime;
        lastTime = t;

        // 阶段机
        if (phase === "boot") {
          if (introDoneRef.current) {
            // 重建（resize / 切语言）：直接重播聚合，不重播碎裂
            phase = "converge";
            phaseT0 = elapsed;
            program.uniforms.uProgress.value = 0;
            setVisible(true);
            onTakeoverRef.current();
          } else {
            phase = "swap";
            phaseT0 = elapsed;
            setVisible(true);
          }
        } else if (phase === "swap") {
          program.uniforms.uProgress.value = 1;
          if (elapsed - phaseT0 >= SWAP_MS) {
            phase = "shatter";
            phaseT0 = elapsed;
            // swap 结束时 takeover，确保 DOM 文字可见到粒子开始碎裂
            onTakeoverRef.current();
          }
        } else if (phase === "shatter") {
          const k = Math.min(1, (elapsed - phaseT0) / SHATTER_MS);
          program.uniforms.uProgress.value = 1 - k * k;
          if (k >= 1) {
            phase = "converge";
            phaseT0 = elapsed;
          }
        } else if (phase === "converge") {
          const k = Math.min(1, (elapsed - phaseT0) / CONVERGE_MS);
          program.uniforms.uProgress.value = easeOutQuad(k);
          if (k >= 1) {
            phase = "idle";
            introDoneRef.current = true;
          }
        } else {
          program.uniforms.uProgress.value = 1;
        }

        // 滚动吹散
        const s = Math.min(1, Math.max(0, window.scrollY / 420));
        program.uniforms.uScatter.value = s * s * (3 - 2 * s);

        // 鼠标平滑
        smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.08;
        smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.08;
        smoothActive += (targetActive - smoothActive) * 0.06;
        program.uniforms.uMouse.value[0] = smoothMouse.x;
        program.uniforms.uMouse.value[1] = smoothMouse.y;
        program.uniforms.uMouseActive.value = smoothActive;

        program.uniforms.uTime.value = elapsed * 0.001;
        localRenderer.render({ scene: mesh });
      };

      const startLoop = () => {
        if (animateId === null && !disposed) {
          lastTime = null;
          animateId = requestAnimationFrame(update);
        }
      };
      const stopLoop = () => {
        if (animateId !== null) {
          cancelAnimationFrame(animateId);
          animateId = null;
          lastTime = null;
        }
      };

      stopGate = observeRenderGate(host, (active) => {
        gateActive = active;
        if (active) startLoop();
        else stopLoop();
      });
      if (gateActive) startLoop();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      targetMouse.x = e.clientX - rect.left;
      targetMouse.y = e.clientY - rect.top;
      targetActive = 1;
    };
    const handleMouseLeave = () => {
      targetActive = 0;
    };

    if (quality.mouseInteraction) {
      window.addEventListener("mousemove", handleMouseMove);
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    }

    // 仅宽度变化触发重建（移动端地址栏收放只改高度）
    const handleResize = () => {
      if (window.innerWidth === lastWidth) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        lastWidth = window.innerWidth;
        setRebuildTick((n) => n + 1);
      }, 300);
    };
    window.addEventListener("resize", handleResize);

    boot();

    return () => {
      disposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      if (quality.mouseInteraction) {
        window.removeEventListener("mousemove", handleMouseMove);
        document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      }
      stopGate?.();
      if (animateId !== null) cancelAnimationFrame(animateId);
      glStateRef.current = null;
      if (renderer) {
        const gl = renderer.gl;
        if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
    // isDark 经 isDarkRef 消费（主题切换不重建）；anchorRef 为稳定 ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, quality, rebuildTick]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none absolute -inset-x-10 -inset-y-16 z-20 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
