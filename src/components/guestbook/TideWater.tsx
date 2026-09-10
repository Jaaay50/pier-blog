"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";
import { observeRenderGate } from "@/lib/webgl";

const VERT = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

/**
 * 水面 shader：纵向depth 渐变 + 若干条起伏的浪脊 + 斜向焦散网纹。
 * 取代原本 2D canvas 上的四条折线波浪；瓶子仍由上层 2D canvas 绘制。
 */
const FRAG = `
precision highp float;

uniform float uTime;
uniform vec3 uSky;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uCrest;
uniform float uCrestAlpha;

varying vec2 vUv;

void main() {
  float depth = 1.0 - vUv.y;
  float t = uTime;

  vec3 col = mix(uSky, uMid, smoothstep(0.0, 0.46, depth));
  col = mix(col, uDeep, smoothstep(0.46, 1.0, depth));

  // 浪脊：六条细正弦带，各自频率与相位不同，叠一层二次谐波避免看出是纯正弦。
  // 线要细、要暗——画粗画亮就成了霓虹灯管，不是水。
  float crest = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float base = 0.12 + fi * 0.15;
    float amp = 0.010 + fi * 0.0032;
    float freq = 5.5 + fi * 2.1;
    float speed = 0.26 + fi * 0.06;
    float y = base
      + sin(vUv.x * freq + t * speed + fi * 1.7) * amp
      + sin(vUv.x * freq * 2.3 - t * speed * 0.6 + fi) * amp * 0.42;
    // 越深的浪脊越淡，制造纵深
    crest += smoothstep(0.0045, 0.0, abs(depth - y)) * (1.0 - fi * 0.13);
  }

  // 焦散：两组斜向波相乘取正，越深越弱，只在近处给一点点碎光
  float c1 = sin(vUv.x * 13.0 + depth * 9.0 + t * 0.5);
  float c2 = sin(vUv.x * 8.5 - depth * 12.0 - t * 0.37);
  float caustic = pow(max(c1 * c2, 0.0), 4.0) * (1.0 - depth) * 0.4;

  col += uCrest * (crest * uCrestAlpha + caustic * uCrestAlpha * 0.5);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * 把任意 CSS 颜色normalize 成 0-1 的 rgb。
 * 主题变量不保证是 hex（可能是 rgb()/hsl()/oklch()），所以借 canvas 解析，
 * 不能像 ShaderGradient 那样假定 #rrggbb。
 */
function cssColorToVec3(input: string, fallback: [number, number, number]): [number, number, number] {
  if (typeof document === "undefined") return fallback;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fallback;
  ctx.fillStyle = "#000000";
  ctx.fillStyle = input;
  const value = ctx.fillStyle;
  if (typeof value === "string" && value.startsWith("#") && value.length === 7) {
    return [
      parseInt(value.slice(1, 3), 16) / 255,
      parseInt(value.slice(3, 5), 16) / 255,
      parseInt(value.slice(5, 7), 16) / 255,
    ];
  }
  const match = /rgba?\(([^)]+)\)/.exec(String(value));
  if (match) {
    const parts = match[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    }
  }
  return fallback;
}

interface TideWaterProps {
  sky: string;
  mid: string;
  deep: string;
  crest: string;
  crestAlpha?: number;
  dpr?: number;
  onReadyChange?: (ready: boolean) => void;
}

/**
 * 调用方负责能力检测（useWebGLQuality）与懒加载；低端设备不要挂载本组件。
 * 未就绪时上层 2D canvas 仍会画回退版水面，所以这里失败是安全的。
 */
export default function TideWater({
  sky,
  mid,
  deep,
  crest,
  crestAlpha = 1,
  dpr = 1,
  onReadyChange,
}: TideWaterProps) {
  const ctnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnRef.current;
    if (!ctn) return;

    let renderer: Renderer | undefined;
    let geometry: Triangle | undefined;
    let program: Program | undefined;
    let stopGate = () => {};
    let removeResize = () => {};
    let rafId: number | null = null;
    let lastTime: number | null = null;
    let disposed = false;

    const stopLoop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = null;
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      stopGate();
      stopLoop();
      removeResize();
      const gl = renderer?.gl;
      if (gl) {
        gl.canvas.removeEventListener("webglcontextlost", dispose);
        geometry?.remove();
        program?.remove();
        if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      onReadyChange?.(false);
    };

    try {
      renderer = new Renderer({ alpha: false, dpr });
      const activeRenderer = renderer;
      const gl = renderer.gl;

      geometry = new Triangle(gl);
      program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uSky: { value: cssColorToVec3(sky, [0.05, 0.1, 0.18]) },
          uMid: { value: cssColorToVec3(mid, [0.09, 0.2, 0.31]) },
          uDeep: { value: cssColorToVec3(deep, [0.04, 0.07, 0.13]) },
          uCrest: { value: cssColorToVec3(crest, [0.66, 0.81, 0.96]) },
          uCrestAlpha: { value: crestAlpha },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });

      const resize = () => activeRenderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      window.addEventListener("resize", resize);
      removeResize = () => window.removeEventListener("resize", resize);
      resize();

      ctn.appendChild(gl.canvas);
      gl.canvas.style.position = "absolute";
      gl.canvas.style.inset = "0";
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      gl.canvas.addEventListener("webglcontextlost", dispose);

      let elapsed = 0;
      let ready = false;
      const activeProgram = program;

      const update = (t: number) => {
        rafId = null;
        if (disposed) return;
        if (lastTime !== null) elapsed += t - lastTime;
        lastTime = t;
        activeProgram.uniforms.uTime.value = elapsed * 0.001;
        try {
          activeRenderer.render({ scene: mesh });
          if (disposed) return;
          if (!ready) {
            ready = true;
            onReadyChange?.(true);
          }
          rafId = requestAnimationFrame(update);
        } catch {
          dispose();
        }
      };
      const startLoop = () => {
        if (!disposed && rafId === null) rafId = requestAnimationFrame(update);
      };

      stopGate = observeRenderGate(ctn, (active) => (active ? startLoop() : stopLoop()));
    } catch {
      dispose();
    }

    return dispose;
  }, [sky, mid, deep, crest, crestAlpha, dpr, onReadyChange]);

  return <div ref={ctnRef} className="absolute inset-0 overflow-hidden" aria-hidden />;
}
