"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

function hash(x: number, y: number) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return h - Math.floor(h); }
export function flowNoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy;
}
export function flowCurl(x: number, y: number, time: number, epsilon = 0.01): [number, number] {
  const n = (px: number, py: number) => flowNoise(px + time * 0.12, py + time * 0.08);
  return [(n(x, y + epsilon) - n(x, y - epsilon)) / (2 * epsilon), -(n(x + epsilon, y) - n(x - epsilon, y)) / (2 * epsilon)];
}
export function flowDisplacement(vx: number, vy: number, deltaSeconds: number): [number, number] {
  const scale = Math.min(1, 180 / Math.max(1, Math.hypot(vx, vy)));
  return [vx * scale * deltaSeconds, vy * scale * deltaSeconds];
}
interface FlowFieldProps { quality: WebGLQuality; attract: boolean; hue: number; isDark?: boolean; onReadyChange?: (ready: boolean) => void }

export default function FlowField({ quality, attract, hue, isDark = true, onReadyChange }: FlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ attract, hue, isDark, onReadyChange });
  const zh = useLocale() === "zh";
  useEffect(() => { live.current = { attract, hue, isDark, onReadyChange }; }, [attract, hue, isDark, onReadyChange]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) { live.current.onReadyChange?.(false); return; }
    let width = 1, height = 1, oldDark = live.current.isDark;
    const count = Math.round(2500 * quality.particleMultiplier), px = new Float32Array(count), py = new Float32Array(count);
    const background = () => live.current.isDark ? "#0a0d14" : "#f3f1ea";
    const clear = () => { ctx.fillStyle = background(); ctx.fillRect(0, 0, width, height); };
    const resize = () => {
      const oldW = width, oldH = height;
      width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * quality.dpr); canvas.height = Math.round(height * quality.dpr);
      ctx.setTransform(quality.dpr, 0, 0, quality.dpr, 0, 0);
      for (let i = 0; i < count; i++) { px[i] *= width / oldW; py[i] *= height / oldH; }
      clear();
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);
    for (let i = 0; i < count; i++) { px[i] = Math.random() * width; py[i] = Math.random() * height; }
    const pointer = { x: 0, y: 0, active: false };
    const move = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); pointer.x = (e.clientX - r.left) * width / Math.max(1, r.width); pointer.y = (e.clientY - r.top) * height / Math.max(1, r.height); pointer.active = true; };
    const leave = () => { pointer.active = false; };
    const down = (e: PointerEvent) => { canvas.setPointerCapture(e.pointerId); move(e); };
    const up = (e: PointerEvent) => { leave(); if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); };
    const key = (event: KeyboardEvent) => {
      const direction: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
      if (event.key === "Escape") { leave(); return; }
      const delta = direction[event.key]; if (!delta) return;
      event.preventDefault(); if (!pointer.active) { pointer.x = width / 2; pointer.y = height / 2; }
      pointer.x = Math.max(0, Math.min(width, pointer.x + delta[0])); pointer.y = Math.max(0, Math.min(height, pointer.y + delta[1])); pointer.active = true;
    };
    canvas.addEventListener("keydown", key);
    canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerleave", leave); canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    let raf: number | null = null, last: number | null = null, time = 0, ready = false;
    const frame = (stamp: number) => {
      raf = null;
      try {
        const dt = last === null ? 1 / 60 : Math.min(1 / 30, (stamp - last) / 1000); last = stamp; time += dt;
        if (oldDark !== live.current.isDark) { oldDark = live.current.isDark; clear(); }
        ctx.globalAlpha = 1 - Math.pow(0.94, dt * 60); ctx.fillStyle = background(); ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < count; i++) {
          const [cx, cy] = flowCurl(px[i] * 0.005, py[i] * 0.005, time);
          let vx = cx * 48, vy = cy * 48;
          if (pointer.active) {
            const dx = pointer.x - px[i], dy = pointer.y - py[i], dist = Math.max(1, Math.hypot(dx, dy));
            const force = Math.min(95, 6000 / dist) * (live.current.attract ? 1 : -1);
            vx += dx / dist * force; vy += dy / dist * force;
          }
          const [dx, dy] = flowDisplacement(vx, vy, dt), ox = px[i], oy = py[i]; px[i] += dx; py[i] += dy;
          if (px[i] < 0 || px[i] > width || py[i] < 0 || py[i] > height) { px[i] = Math.random() * width; py[i] = Math.random() * height; continue; }
          ctx.strokeStyle = `hsla(${live.current.hue + Math.min(35, Math.hypot(vx, vy) * 0.15)},70%,${live.current.isDark ? 65 : 35}%,0.55)`;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px[i], py[i]); ctx.stroke();
        }
        if (!ready) { ready = true; live.current.onReadyChange?.(true); }
        raf = requestAnimationFrame(frame);
      } catch { stop(); live.current.onReadyChange?.(false); }
    };
    const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; leave(); };
    const gate = observeRenderGate(canvas, (active) => { if (active && raf === null) raf = requestAnimationFrame(frame); else if (!active) stop(); });
    return () => { gate(); stop(); ro.disconnect(); canvas.removeEventListener("keydown", key); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); };
  }, [quality.dpr, quality.particleMultiplier]);
  return <canvas ref={canvasRef} tabIndex={0} role="img" aria-label={zh ? "流场粒子，移动指针或按方向键改变轨迹" : "Flow field particles: use the pointer or arrow keys to change paths"} className="block h-full w-full touch-none" />;
}
