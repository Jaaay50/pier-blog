"use client";

import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Geometry } from "ogl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Phase 9.1 — Hero 粒子重组标题
 *
 * 管线：DOM 标题仅作 SSR 可见层与采样锚点（实际绘制成功后隐藏）→
 * 字体就绪后逐字采样 → 粒子直接从混沌四散（碎裂态）聚合成字，
 * 无完整字形停留 → 待机呼吸 + 鼠标斥力 + 滚动吹散。
 * 采样/context 失败时调用 onFail，由父组件回退 DOM 标题。
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

type Phase = "boot" | "converge" | "idle";

const CONVERGE_MS = 1650;

interface ParticleTitleProps {
  /** 标题文本（变化时整体重建重采样） */
  title: string;
  /** 逐字 span 容器（aria-hidden 的可见 DOM 标题层） */
  anchorRef: RefObject<HTMLSpanElement | null>;
  isDark: boolean;
  quality: WebGLQuality;
  /** 粒子路径失败回调（采样/context 创建失败，父组件回退 DOM 标题） */
  onFail: () => void;
  /** 首次有效绘制后为 true，重建、失败及卸载时撤销。 */
  onReadyChange?: (ready: boolean) => void;
}

export default function ParticleTitle({
  title,
  anchorRef,
  isDark,
  quality,
  onFail,
  onReadyChange,
}: ParticleTitleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [rebuildTick, setRebuildTick] = useState(0);
  const isDarkRef = useRef(isDark);
  const themeDirtyRef = useRef(true);
  const onFailRef = useRef(onFail);
  const onReadyRef = useRef(onReadyChange);
  const readyRef = useRef(false);

  // 同步最新值到 ref（不触发重建）
  useEffect(() => {
    isDarkRef.current = isDark;
    themeDirtyRef.current = true;
  }, [isDark]);
  useLayoutEffect(() => {
    onFailRef.current = onFail;
    onReadyRef.current = onReadyChange;
  }, [onFail, onReadyChange]);

  useLayoutEffect(() => {
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
    let geometry: Geometry | null = null;
    let program: Program | null = null;
    let fontTimer: ReturnType<typeof setTimeout> | null = null;
    let removeContextLost = () => {};
    let needsDrawValidation = true;
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

    const setReady = (ready: boolean) => {
      if (readyRef.current === ready) return;
      // Canvas visibility and the parent's title handoff occur in the same task.
      host.style.visibility = ready ? "visible" : "hidden";
      // React may batch the callback; keep both visual layers atomic before paint.
      anchor.style.opacity = ready ? "0" : "1";
      readyRef.current = ready;
      onReadyRef.current?.(ready);
    };
    const safelyRelease = (release: () => void) => {
      try { release(); } catch { /* Context loss must not interrupt cleanup. */ }
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      setReady(false);
      if (fontTimer) clearTimeout(fontTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      if (quality.mouseInteraction) {
        window.removeEventListener("mousemove", handleMouseMove);
        document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      }
      safelyRelease(() => stopGate?.());
      if (animateId !== null) cancelAnimationFrame(animateId);
      animateId = null;
      safelyRelease(removeContextLost);
      if (renderer) {
        const gl = renderer.gl;
        safelyRelease(() => geometry?.remove());
        if (program) {
          const activeProgram = program;
          safelyRelease(() => gl.deleteShader(activeProgram.vertexShader));
          safelyRelease(() => gl.deleteShader(activeProgram.fragmentShader));
          safelyRelease(() => activeProgram.remove());
        }
        if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
        safelyRelease(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
      }
    };
    const fail = () => {
      if (disposed) return;
      dispose();
      onFailRef.current();
    };

    const boot = async () => {
      // 字体门控：display 字体就绪后才采样（3s 超时兜底：保持 DOM 标题）
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => { fontTimer = setTimeout(resolve, 3000); }),
        ]);
      } catch {
        /* fonts API 异常时直接尝试采样 */
      }
      if (fontTimer) clearTimeout(fontTimer);
      if (disposed) return;

      const sample = sampleText(anchor, host, targetCount);
      if (!sample) {
        fail(); // 采样失败：回退 DOM 标题
        return;
      }

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
        fail(); // context 创建失败：回退 DOM 标题
        return;
      }
      if (disposed) return;
      renderer = localRenderer;
      const gl = localRenderer.gl;
      gl.canvas.addEventListener("webglcontextlost", fail);
      removeContextLost = () => gl.canvas.removeEventListener("webglcontextlost", fail);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, isDarkRef.current ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      localRenderer.setSize(w, h);

      geometry = new Geometry(gl, {
        aStart: { size: 2, data: starts },
        aTarget: { size: 2, data: targets },
        aSeed: { size: 4, data: seeds },
      });

      const [c1, c2, c3] = readThemeColors();
      program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        depthTest: false,
        uniforms: {
          uResolution: { value: [w, h] },
          uProgress: { value: 0 },
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
      // OGL logs shader failures instead of throwing: verify both shaders and link.
      if (!gl.getShaderParameter(program.vertexShader, gl.COMPILE_STATUS) ||
          !gl.getShaderParameter(program.fragmentShader, gl.COMPILE_STATUS) ||
          !gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
        throw new Error("ParticleTitle shader initialization failed");
      }
      const activeProgram = program;
      const mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      host.appendChild(gl.canvas);

      const easeOutQuad = (k: number) => 1 - (1 - k) * (1 - k);

      const update = (t: number) => {
        animateId = null;
        if (disposed) return;
        try {
          // next-themes 的父 effect 晚于本组件更新根节点 class。
          // 在下一次实际绘制前读 CSS，避免锁住旧主题色；暂停时保留标记，
          // 恢复首帧再同步，不额外开 RAF，也不每帧读取 computed style。
          if (themeDirtyRef.current) {
            const [c1, c2, c3] = readThemeColors();
            activeProgram.uniforms.uColor1.value = c1;
            activeProgram.uniforms.uColor2.value = c2;
            activeProgram.uniforms.uColor3.value = c3;
            gl.blendFunc(gl.SRC_ALPHA, isDarkRef.current ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
            themeDirtyRef.current = false;
            needsDrawValidation = true;
          }

          if (lastTime !== null) elapsed += t - lastTime;
          lastTime = t;

          // 阶段机：开场即碎裂态，直接聚合成字（resize/切语言重建同样重播聚合）
          if (phase === "boot") {
            phase = "converge";
            phaseT0 = elapsed;
            activeProgram.uniforms.uProgress.value = 0;
          } else if (phase === "converge") {
            const k = Math.min(1, (elapsed - phaseT0) / CONVERGE_MS);
            activeProgram.uniforms.uProgress.value = easeOutQuad(k);
            if (k >= 1) phase = "idle";
          } else {
            activeProgram.uniforms.uProgress.value = 1;
          }

          // 滚动吹散
          const s = Math.min(1, Math.max(0, window.scrollY / 420));
          activeProgram.uniforms.uScatter.value = s * s * (3 - 2 * s);

          // 鼠标平滑
          smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.08;
          smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.08;
          smoothActive += (targetActive - smoothActive) * 0.06;
          activeProgram.uniforms.uMouse.value[0] = smoothMouse.x;
          activeProgram.uniforms.uMouse.value[1] = smoothMouse.y;
          activeProgram.uniforms.uMouseActive.value = smoothActive;

          activeProgram.uniforms.uTime.value = elapsed * 0.001;
          localRenderer.render({ scene: mesh });
          // Validate first/reconfigured/resumed draw only; avoid a per-frame GPU stall.
          if (gl.isContextLost() || (needsDrawValidation && gl.getError() !== gl.NO_ERROR)) {
            throw new Error("ParticleTitle draw failed");
          }
          needsDrawValidation = false;
          if (disposed) return;
          setReady(true);
          animateId = requestAnimationFrame(update);
        } catch {
          fail();
        }
      };

      const startLoop = () => {
        if (animateId === null && !disposed) {
          lastTime = null;
          needsDrawValidation = true;
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

    boot().catch(fail);

    return dispose;
    // isDark 经 isDarkRef 消费（主题切换不重建）；anchorRef 为稳定 ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, quality, rebuildTick]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ visibility: "hidden" }}
      className="pointer-events-none absolute -inset-x-10 -inset-y-16 z-20"
    />
  );
}
