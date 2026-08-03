"use client";

import { useEffect, useRef, useState } from "react";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — Shader 调色台
 *
 * 原生 WebGL1（无 ogl 依赖，进一步展示底层能力）：
 * - 自写 value noise + FBM（分形布朗运动）多倍频噪声
 * - domain warping（噪声扭曲噪声）产生流动感
 * - HSV 色彩空间调色，滑杆实时调 hue / 流速 / 湍流倍频 / 缩放
 * - randomize 按钮随机参数组合
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uHue;
uniform float uFlowSpeed;
uniform float uOctaves;
uniform float uZoom;

// value noise：网格随机 + smoothstep 插值
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// FBM：多倍频叠加，uOctaves 控制实际参与层数（分数部分平滑过渡）
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    float w = clamp(uOctaves - float(i), 0.0, 1.0);
    v += amp * noise(p) * w;
    p = rot * p * 2.0;
    amp *= 0.5;
  }
  return v;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  uv *= uZoom;

  float t = uTime * uFlowSpeed;

  // domain warping：q 扭曲 r，r 扭曲最终 fbm，产生流体感
  vec2 q = vec2(
    fbm(uv + vec2(0.0, 0.0) + t * 0.15),
    fbm(uv + vec2(5.2, 1.3) - t * 0.12)
  );
  vec2 r = vec2(
    fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.18),
    fbm(uv + 4.0 * q + vec2(8.3, 2.8) - t * 0.10)
  );
  float f = fbm(uv + 4.0 * r);

  // 亮度分层 + 色相沿噪声域偏移
  float hue = fract(uHue + r.x * 0.25 + f * 0.15);
  float sat = 0.55 + 0.35 * q.y;
  float val = pow(f * 1.35 + 0.15, 1.4);

  vec3 col = hsv2rgb(vec3(hue, sat, val));
  // 暗部压向深色而不是纯黑，柔和
  col = mix(vec3(0.02, 0.02, 0.04), col, smoothstep(0.0, 0.9, val));

  gl_FragColor = vec4(col, 1.0);
}
`;

interface Params {
  hue: number;
  flowSpeed: number;
  octaves: number;
  zoom: number;
}

const DEFAULTS: Params = { hue: 0.6, flowSpeed: 0.5, octaves: 4, zoom: 1.6 };

interface ShaderMixerProps {
  quality: WebGLQuality;
  labels: {
    hue: string;
    flow: string;
    turbulence: string;
    zoom: string;
    randomize: string;
  };
  /** 只渲染 canvas 铺满容器，隐藏控件区（LabTeaser 幕布用） */
  canvasOnly?: boolean;
}

export default function ShaderMixer({ quality, labels, canvasOnly = false }: ShaderMixerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<Params>(DEFAULTS);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    const gl =
      canvas.getContext("webgl", { antialias: false }) ||
      canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return;
    host.appendChild(canvas);

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        // shader 编译失败：清理并放弃（外层已有静态降级）
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      host.removeChild(canvas);
      return;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // 全屏三角形
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uHue = gl.getUniformLocation(prog, "uHue");
    const uFlow = gl.getUniformLocation(prog, "uFlowSpeed");
    const uOct = gl.getUniformLocation(prog, "uOctaves");
    const uZoom = gl.getUniformLocation(prog, "uZoom");

    // FBM 每像素 6 层循环开销大，渲染分辨率限 0.75x（视觉几乎无差）
    const renderScale = quality.tier === "high" ? 0.75 : 0.5;
    const resize = () => {
      const w = Math.max(1, Math.round(host.clientWidth * renderScale));
      const h = Math.max(1, Math.round(host.clientHeight * renderScale));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (lastTime !== null) elapsed += t - lastTime;
      lastTime = t;
      const p = paramsRef.current;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed * 0.001);
      gl.uniform1f(uHue, p.hue);
      gl.uniform1f(uFlow, p.flowSpeed);
      gl.uniform1f(uOct, p.octaves);
      gl.uniform1f(uZoom, p.zoom);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const start = () => {
      if (raf === null) {
        lastTime = null;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    start();
    const stopGate = observeRenderGate(host, (active) =>
      active ? start() : stop()
    );

    return () => {
      stopGate();
      stop();
      ro.disconnect();
      if (canvas.parentNode === host) host.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [quality.tier]);

  const randomize = () => {
    setParams({
      hue: Math.random(),
      flowSpeed: 0.2 + Math.random() * 1.3,
      octaves: 2 + Math.random() * 4,
      zoom: 0.8 + Math.random() * 2.4,
    });
  };

  const sliders: {
    key: keyof Params;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "hue", label: labels.hue, min: 0, max: 1, step: 0.01 },
    { key: "flowSpeed", label: labels.flow, min: 0, max: 1.5, step: 0.05 },
    { key: "octaves", label: labels.turbulence, min: 1, max: 6, step: 0.1 },
    { key: "zoom", label: labels.zoom, min: 0.5, max: 3.5, step: 0.05 },
  ];

  return (
    <div className="flex h-full flex-col">
      <div ref={hostRef} className="relative min-h-0 flex-1 overflow-hidden" />
      {!canvasOnly && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-t border-[var(--border)] bg-[var(--bg-card)] p-4">
          {sliders.map((s) => (
            <label key={s.key} className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                {s.label}
                <span className="font-mono tabular-nums">
                  {params[s.key].toFixed(2)}
                </span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key]}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    [s.key]: parseFloat(e.target.value),
                  }))
                }
                className="lab-slider"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={randomize}
            className="col-span-2 mt-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {labels.randomize}
          </button>
        </div>
      )}
    </div>
  );
}
