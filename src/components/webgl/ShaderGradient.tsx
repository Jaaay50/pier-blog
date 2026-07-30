'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { observeRenderGate } from '@/lib/webgl';

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
 * 流体噪声渐变 shader：
 * 三层 simplex 噪声域扭曲（domain warp），双色插值 + 呼吸高光。
 */
const FRAG = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uIntensity;
uniform float uSpeed;

varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * uSpeed;

  // 域扭曲：两层噪声互相扰动，产生流体感
  float n1 = snoise(p * 1.6 + vec2(t * 0.12, -t * 0.08));
  float n2 = snoise(p * 2.4 + vec2(-t * 0.09, t * 0.11) + n1 * 0.8);
  float n3 = snoise(p * 0.9 + vec2(t * 0.05, t * 0.04) + n2 * 0.5);

  float blend1 = smoothstep(-0.6, 0.7, n1 + n3 * 0.5);
  float blend2 = smoothstep(-0.4, 0.8, n2);

  vec3 col = mix(uColorA, uColorB, blend1);
  col = mix(col, uColorC, blend2 * 0.55);

  // 呼吸高光
  float glow = smoothstep(0.55, 1.0, n3) * (0.5 + 0.5 * sin(t * 0.6));
  col += glow * uIntensity * 0.12;

  // alpha 随噪声轻微起伏，让边缘与页面底色融合
  float alpha = uIntensity * (0.75 + 0.25 * blend1);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

const hexToVec3 = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
};

interface ShaderGradientProps {
  /** 三个渐变色（hex） */
  colors?: [string, string, string];
  /** 整体强度 0-1 */
  intensity?: number;
  speed?: number;
  dpr?: number;
  className?: string;
}

/**
 * Phase 3：流体 Shader 渐变背景。
 * 单三角形全屏 shader，支持渲染门控（视口外/页面隐藏时暂停）。
 * 注意：调用方负责能力检测，低端设备请勿挂载本组件。
 */
export default function ShaderGradient({
  colors = ['#d97757', '#e8c4a0', '#c6613f'],
  intensity = 1,
  speed = 1,
  dpr = 1,
  className = '',
}: ShaderGradientProps) {
  const ctnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnRef.current;
    if (!ctn) return;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, dpr });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uColorA: { value: hexToVec3(colors[0]) },
        uColorB: { value: hexToVec3(colors[1]) },
        uColorC: { value: hexToVec3(colors[2]) },
        uIntensity: { value: intensity },
        uSpeed: { value: speed },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    };
    window.addEventListener('resize', resize);
    resize();

    ctn.appendChild(gl.canvas);
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.inset = '0';

    let rafId: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;

    const update = (t: number) => {
      rafId = requestAnimationFrame(update);
      if (lastTime !== null) elapsed += t - lastTime;
      lastTime = t;
      program.uniforms.uTime.value = elapsed * 0.001;
      renderer.render({ scene: mesh });
    };
    const startLoop = () => {
      if (rafId === null) rafId = requestAnimationFrame(update);
    };
    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        lastTime = null;
      }
    };

    startLoop();
    const stopGate = observeRenderGate(ctn, active =>
      active ? startLoop() : stopLoop()
    );

    return () => {
      stopGate();
      stopLoop();
      window.removeEventListener('resize', resize);
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // colors 数组字面量每次渲染都是新引用，用展开值做依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors[0], colors[1], colors[2], intensity, speed, dpr]);

  return (
    <div
      ref={ctnRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      aria-hidden
    />
  );
}
