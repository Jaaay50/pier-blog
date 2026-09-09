"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Geometry, Camera } from "ogl";
import { useLocale } from "next-intl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — 3D 形变
 *
 * ogl POINTS 参数曲面 per-point stagger morph：
 * - 4 种形态：球 → 环面结 → 立方 → 波面
 * - 鼠标拖拽旋转（惯性）
 * - 点击/自动轮播切换形态
 * - per-point delay 使形变有流体感
 */

const COUNT = 80; // 每维度采样数（total = COUNT²）

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec3 targetPos;
attribute float delay;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uMorphProgress;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uPointSize;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float p = clamp(uMorphProgress * 1.3 - delay * 0.3, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  
  vec3 pos = mix(position, targetPos, p);
  
  // 轻微扰动
  float wobble = sin(uTime * 1.2 + delay * 6.2831) * 0.02;
  pos += normalize(pos + 0.001) * wobble;
  
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;
  gl_PointSize = uPointSize * (3.5 / max(0.1, -mvPos.z));
  
  float mixer = (pos.y + 1.5) / 3.0;
  vColor = mix(uColor1, uColor2, mixer);
  vAlpha = 0.8 + 0.2 * sin(uTime + delay * 3.14);
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

type Shape = "sphere" | "torus" | "cube" | "wave";

export function generateSphere(count: number): Float32Array {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1)) * Math.PI;
      const v = (j / (count - 1)) * Math.PI * 2;
      arr.push(
        Math.sin(u) * Math.cos(v),
        Math.cos(u),
        Math.sin(u) * Math.sin(v)
      );
    }
  }
  return new Float32Array(arr);
}

export function generateTorus(count: number): Float32Array {
  const arr: number[] = [];
  const R = 1.0, r = 0.4;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1)) * Math.PI * 2;
      const v = (j / (count - 1)) * Math.PI * 2;
      arr.push(
        (R + r * Math.cos(v)) * Math.cos(u),
        r * Math.sin(v),
        (R + r * Math.cos(v)) * Math.sin(u)
      );
    }
  }
  return new Float32Array(arr);
}

export function generateCube(count: number): Float32Array {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1)) * 2 - 1;
      const v = (j / (count - 1)) * 2 - 1;
      const face = (i * count + j) % 6;
      switch (face) {
        case 0: arr.push(1, u, v); break;
        case 1: arr.push(-1, u, v); break;
        case 2: arr.push(u, 1, v); break;
        case 3: arr.push(u, -1, v); break;
        case 4: arr.push(u, v, 1); break;
        default: arr.push(u, v, -1);
      }
    }
  }
  return new Float32Array(arr);
}

export function generateWave(count: number): Float32Array {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1) - 0.5) * 4;
      const v = (j / (count - 1) - 0.5) * 4;
      const y = Math.sin(u * 1.5) * Math.cos(v * 1.5) * 0.6;
      arr.push(u * 0.4, y, v * 0.4);
    }
  }
  return new Float32Array(arr);
}

const SHAPES: Shape[] = ["sphere", "torus", "cube", "wave"];

export function morphDelta(previous: number | null, now: number) {
  return previous === null ? 0 : Math.max(0, Math.min(0.05, (now - previous) / 1000));
}

interface Morph3DProps {
  quality: WebGLQuality; autoRotate: boolean; isDark: boolean;
  onShapeChange?: (shape: Shape) => void; onReadyChange?: (ready: boolean) => void;
}

export default function Morph3D({ quality, autoRotate, isDark, onShapeChange, onReadyChange }: Morph3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [currentShape, setCurrentShape] = useState<Shape>("sphere");
  const [autoCycle, setAutoCycle] = useState(true);
  const zh = useLocale() === "zh";
  const live = useRef({ autoRotate, isDark, onShapeChange, onReadyChange, autoCycle });
  const desired = useRef<Shape>("sphere");
  useEffect(() => { live.current = { autoRotate, isDark, onShapeChange, onReadyChange, autoCycle }; }, [autoRotate, isDark, onShapeChange, onReadyChange, autoCycle]);
  const nextShape = () => {
    const next = SHAPES[(SHAPES.indexOf(desired.current) + 1) % SHAPES.length];
    desired.current = next; setCurrentShape(next); live.current.onShapeChange?.(next);
  };

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    let renderer: Renderer | undefined, geometry: Geometry | undefined, program: Program | undefined;
    let raf: number | null = null, last: number | null = null, disposed = false;
    let stopGate = () => {}, removeInput = () => {}, disconnectResize = () => {};
    const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; };
    const dispose = () => {
      if (disposed) return; disposed = true; stopGate(); stop(); disconnectResize(); removeInput();
      geometry?.remove(); program?.remove();
      const gl = renderer?.gl;
      if (gl) { gl.canvas.removeEventListener("webglcontextlost", fail); if (gl.canvas.parentNode === host) host.removeChild(gl.canvas); gl.getExtension("WEBGL_lose_context")?.loseContext(); }
    };
    const fail = () => { dispose(); live.current.onReadyChange?.(false); };
    try {
      renderer = new Renderer({ alpha: false, dpr: quality.dpr, antialias: true });
      const activeRenderer = renderer, gl = renderer.gl;
      const camera = new Camera(gl, { fov: 45 }); camera.position.z = 4;
      const count = quality.tier === "high" ? COUNT : 48;
      const shapes: Record<Shape, Float32Array> = { sphere: generateSphere(count), torus: generateTorus(count), cube: generateCube(count), wave: generateWave(count) };
      const source = new Float32Array(shapes.sphere), target = new Float32Array(shapes.sphere);
      const delays = Float32Array.from({ length: count * count }, (_, i) => ((i * 17) % 100) / 100);
      geometry = new Geometry(gl, { position: { size: 3, data: source }, targetPos: { size: 3, data: target }, delay: { size: 1, data: delays } });
      const activeGeometry = geometry;
      program = new Program(gl, { vertex, fragment, uniforms: { uMorphProgress: { value: 1 }, uTime: { value: 0 }, uMouse: { value: [0, 0] }, uColor1: { value: [0.42, 0.61, 0.8] }, uColor2: { value: [0.55, 0.5, 0.8] }, uPointSize: { value: quality.dpr * 2.7 } }, transparent: true, depthTest: false });
      const activeProgram = program;
      if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) throw new Error("Unable to link morph shader");
      const mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program }); mesh.rotation.x = 0.2;
      const resize = () => { activeRenderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)); camera.perspective({ aspect: Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight) }); };
      resize(); const ro = new ResizeObserver(resize); ro.observe(host); disconnectResize = () => ro.disconnect();
      host.appendChild(gl.canvas); gl.canvas.style.display = "block"; gl.canvas.style.touchAction = "none";
      gl.canvas.addEventListener("webglcontextlost", fail);
      let dragging: number | null = null, mx = 0, my = 0, targetX = 0.2, targetY = 0;
      const down = (e: PointerEvent) => { if (dragging !== null) return; dragging = e.pointerId; mx = e.clientX; my = e.clientY; gl.canvas.setPointerCapture(e.pointerId); };
      const move = (e: PointerEvent) => { if (dragging !== e.pointerId) return; targetY += (e.clientX - mx) * 0.01; targetX = Math.max(-1.5, Math.min(1.5, targetX + (e.clientY - my) * 0.01)); mx = e.clientX; my = e.clientY; };
      const up = (e: PointerEvent) => { if (dragging !== e.pointerId) return; dragging = null; if (gl.canvas.hasPointerCapture(e.pointerId)) gl.canvas.releasePointerCapture(e.pointerId); };
      gl.canvas.tabIndex = 0;
      gl.canvas.setAttribute("aria-label", zh ? "3D 形变，按方向键旋转" : "3D morph: use arrow keys to rotate");
      const key = (event: KeyboardEvent) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "ArrowLeft") targetY -= 0.15;
        if (event.key === "ArrowRight") targetY += 0.15;
        if (event.key === "ArrowUp") targetX = Math.max(-1.5, targetX - 0.15);
        if (event.key === "ArrowDown") targetX = Math.min(1.5, targetX + 0.15);
      };
      gl.canvas.addEventListener("keydown", key);
      gl.canvas.addEventListener("pointerdown", down); gl.canvas.addEventListener("pointermove", move); gl.canvas.addEventListener("pointerup", up); gl.canvas.addEventListener("pointercancel", up); gl.canvas.addEventListener("lostpointercapture", up);
      removeInput = () => { gl.canvas.removeEventListener("keydown", key); gl.canvas.removeEventListener("pointerdown", down); gl.canvas.removeEventListener("pointermove", move); gl.canvas.removeEventListener("pointerup", up); gl.canvas.removeEventListener("pointercancel", up); gl.canvas.removeEventListener("lostpointercapture", up); };
      let progress = 1, elapsed = 0, cycleTime = 0, shape: Shape = "sphere", ready = false;
      const frame = (stamp: number) => {
        raf = null; if (disposed) return;
        const dt = morphDelta(last, stamp); last = stamp; elapsed += dt; cycleTime += dt;
        if (live.current.autoCycle && cycleTime >= 6 && progress >= 1) {
          desired.current = SHAPES[(SHAPES.indexOf(shape) + 1) % SHAPES.length]; setCurrentShape(desired.current); live.current.onShapeChange?.(desired.current);
        }
        if (desired.current !== shape) {
          for (let i = 0; i < source.length; i++) {
            const p = Math.max(0, Math.min(1, progress * 1.3 - delays[Math.floor(i / 3)] * 0.3));
            const eased = p * p * (3 - 2 * p); source[i] += (target[i] - source[i]) * eased;
          }
          target.set(shapes[desired.current]); activeGeometry.attributes.position.needsUpdate = true; activeGeometry.attributes.targetPos.needsUpdate = true;
          shape = desired.current; progress = 0; cycleTime = 0;
        }
        progress = Math.min(1, progress + dt * 0.8);
        if (live.current.autoRotate && dragging === null) targetY += dt * 0.3;
        const follow = 1 - Math.exp(-10 * dt); mesh.rotation.x += (targetX - mesh.rotation.x) * follow; mesh.rotation.y += (targetY - mesh.rotation.y) * follow;
        activeProgram.uniforms.uMorphProgress.value = progress; activeProgram.uniforms.uTime.value = elapsed;
        activeProgram.uniforms.uColor1.value = live.current.isDark ? [0.42, 0.75, 0.9] : [0.55, 0.2, 0.1];
        activeProgram.uniforms.uColor2.value = live.current.isDark ? [0.65, 0.5, 0.95] : [0.2, 0.4, 0.6];
        const bg = live.current.isDark ? [0.04, 0.05, 0.08] : [0.95, 0.94, 0.92]; gl.clearColor(bg[0], bg[1], bg[2], 1);
        try { activeRenderer.render({ scene: mesh, camera }); } catch { fail(); return; }
        if (!ready) { ready = true; live.current.onReadyChange?.(true); }
        raf = requestAnimationFrame(frame);
      };
      stopGate = observeRenderGate(host, (active) => { if (active && !disposed && raf === null) raf = requestAnimationFrame(frame); else if (!active) { dragging = null; stop(); } });
    } catch { fail(); }
    return dispose;
  }, [quality.dpr, quality.tier, zh]);

  const names: Record<Shape, string> = zh ? { sphere: "球体", torus: "环面", cube: "立方体", wave: "波面" } : { sphere: "Sphere", torus: "Torus", cube: "Cube", wave: "Wave" };
  return <div className="relative h-full w-full">
    <div ref={hostRef} role="img" aria-label={names[currentShape]} className="h-full w-full" />
    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
      <button type="button" aria-pressed={autoCycle} onClick={() => setAutoCycle((value) => !value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]">{zh ? "自动形变" : "Auto Morph"} {autoCycle ? "ON" : "OFF"}</button>
      <button type="button" onClick={nextShape} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]">{names[currentShape]} · {zh ? "下一形态" : "Next Shape"} →</button>
    </div>
  </div>;
}
