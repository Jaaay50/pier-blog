"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

export interface PhysicsBall { x: number; y: number; vx: number; vy: number; r: number; hue: number }
export const PHYSICS_STEP = 1 / 120;
const RESTITUTION = 0.75;
const CELL = 40; // Diameter is at most 36 CSS px; one neighboring cell covers every contact.

export function collideBalls(balls: PhysicsBall[], locked: PhysicsBall | null = null) {
  const cells = new Map<string, number[]>();
  balls.forEach((ball, index) => {
    const key = `${Math.floor(ball.x / CELL)},${Math.floor(ball.y / CELL)}`;
    const cell = cells.get(key) ?? []; cell.push(index); cells.set(key, cell);
  });
  balls.forEach((a, i) => {
    const cx = Math.floor(a.x / CELL), cy = Math.floor(a.y / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      for (const j of cells.get(`${cx + ox},${cy + oy}`) ?? []) {
        if (j <= i) continue;
        const b = balls[j], dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= a.r + b.r) continue;
        const nx = distance > 1e-8 ? dx / distance : 1, ny = distance > 1e-8 ? dy / distance : 0;
        const ia = a === locked ? 0 : 1, ib = b === locked ? 0 : 1;
        if (ia + ib === 0) continue;
        const overlap = (a.r + b.r - distance) / (ia + ib);
        a.x -= nx * overlap * ia; a.y -= ny * overlap * ia;
        b.x += nx * overlap * ib; b.y += ny * overlap * ib;
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (closing >= 0) continue;
        const impulse = -(1 + RESTITUTION) * closing / (ia + ib);
        a.vx -= impulse * nx * ia; a.vy -= impulse * ny * ia;
        b.vx += impulse * nx * ib; b.vy += impulse * ny * ib;
      }
    }
  });
}

function constrain(ball: PhysicsBall, width: number, height: number) {
  const minX = Math.min(ball.r, width / 2), minY = Math.min(ball.r, height / 2);
  const maxX = Math.max(minX, width - ball.r), maxY = Math.max(minY, height - ball.r);
  if (ball.x < minX) { ball.x = minX; if (ball.vx < 0) ball.vx *= -RESTITUTION; }
  if (ball.x > maxX) { ball.x = maxX; if (ball.vx > 0) ball.vx *= -RESTITUTION; }
  if (ball.y < minY) { ball.y = minY; if (ball.vy < 0) ball.vy *= -RESTITUTION; }
  if (ball.y > maxY) { ball.y = maxY; if (ball.vy > 0) ball.vy *= -RESTITUTION; }
}

/** Velocity Verlet with a fixed clock: display refresh rate cannot change the simulation. */
export function stepPhysics(balls: PhysicsBall[], width: number, height: number, gravity: boolean, locked: PhysicsBall | null = null, dt = PHYSICS_STEP) {
  const ay = gravity ? 800 : 0;
  for (const b of balls) {
    if (b === locked) continue;
    b.x += b.vx * dt; b.y += b.vy * dt + 0.5 * ay * dt * dt;
    b.vy += ay * dt;
    const damping = Math.pow(0.998, dt * 60); b.vx *= damping; b.vy *= damping;
    constrain(b, width, height);
  }
  for (let pass = 0; pass < 3; pass++) collideBalls(balls, locked);
  for (const b of balls) if (b !== locked) constrain(b, width, height);
}

interface PhysicsSandboxProps {
  quality: WebGLQuality; gravityOn: boolean; onBallCount: (n: number) => void;
  isDark?: boolean; onReadyChange?: (ready: boolean) => void;
}

export default function PhysicsSandbox({ quality, gravityOn, onBallCount, isDark = true, onReadyChange }: PhysicsSandboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ gravityOn, isDark, onBallCount, onReadyChange });
  const zh = useLocale() === "zh";
  useEffect(() => { live.current = { gravityOn, isDark, onBallCount, onReadyChange }; }, [gravityOn, isDark, onBallCount, onReadyChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) { live.current.onReadyChange?.(false); return; }
    let width = 1, height = 1;
    const balls: PhysicsBall[] = [];
    let drag: { id: number; ball: PhysicsBall; x: number; y: number; t: number; vx: number; vy: number } | null = null;
    const resize = () => {
      const oldW = width, oldH = height;
      width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * quality.dpr); canvas.height = Math.round(height * quality.dpr);
      ctx.setTransform(quality.dpr, 0, 0, quality.dpr, 0, 0);
      for (const b of balls) { b.x *= width / oldW; b.y *= height / oldH; constrain(b, width, height); }
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const addBall = (x: number, y: number) => {
      const b = { x, y, vx: (Math.random() - 0.5) * 200, vy: -120, r: 12 + Math.random() * 6, hue: 175 + Math.random() * 110 };
      constrain(b, width, height); balls.push(b);
      if (balls.length > 40) balls.shift();
      live.current.onBallCount(balls.length);
    };
    for (let i = 0; i < 5; i++) addBall(width * (0.2 + i * 0.15), height * (0.2 + (i % 2) * 0.12));
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * width / Math.max(1, r.width), y: (e.clientY - r.top) * height / Math.max(1, r.height) };
    };
    const down = (e: PointerEvent) => {
      if (drag || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault(); canvas.focus({ preventScroll: true });
      const p = pos(e), hit = [...balls].reverse().find((b) => Math.hypot(b.x - p.x, b.y - p.y) <= b.r + 4);
      if (!hit) { addBall(p.x, p.y); return; }
      canvas.setPointerCapture(e.pointerId);
      hit.vx = 0; hit.vy = 0;
      drag = { id: e.pointerId, ball: hit, ...p, t: e.timeStamp, vx: 0, vy: 0 };
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const p = pos(e), dt = Math.max(0.008, (e.timeStamp - drag.t) / 1000);
      drag.vx = Math.max(-1200, Math.min(1200, (p.x - drag.x) / dt));
      drag.vy = Math.max(-1200, Math.min(1200, (p.y - drag.y) / dt));
      drag.ball.x = p.x; drag.ball.y = p.y; constrain(drag.ball, width, height);
      drag.x = p.x; drag.y = p.y; drag.t = e.timeStamp;
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const launch = e.type === "pointerup" && e.timeStamp - drag.t < 120;
      drag.ball.vx = launch ? drag.vx : 0; drag.ball.vy = launch ? drag.vy : 0;
      drag = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addBall(width / 2, height / 4); }
    };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up); canvas.addEventListener("lostpointercapture", up); canvas.addEventListener("keydown", keyboard);
    let raf: number | null = null, last: number | null = null, accumulator = 0, ready = false;
    const frame = (time: number) => {
      raf = null;
      try {
        accumulator += last === null ? 0 : Math.min(0.05, (time - last) / 1000); last = time;
        while (accumulator + 1e-10 >= PHYSICS_STEP) { stepPhysics(balls, width, height, live.current.gravityOn, drag?.ball); accumulator -= PHYSICS_STEP; }
        ctx.fillStyle = live.current.isDark ? "#101219" : "#f3f1ea"; ctx.fillRect(0, 0, width, height);
        for (const b of balls) {
          const grad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r);
          grad.addColorStop(0, `hsl(${b.hue},70%,75%)`); grad.addColorStop(1, `hsl(${b.hue},65%,40%)`);
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        }
        if (!ready) { ready = true; live.current.onReadyChange?.(true); }
        raf = requestAnimationFrame(frame);
      } catch { stop(); live.current.onReadyChange?.(false); }
    };
    const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; accumulator = 0; const capture = drag?.id; drag = null; if (capture !== undefined && canvas.hasPointerCapture(capture)) canvas.releasePointerCapture(capture); };
    const stopGate = observeRenderGate(canvas, (active) => { if (active && raf === null) raf = requestAnimationFrame(frame); else if (!active) stop(); });
    return () => {
      stopGate(); stop(); ro.disconnect();
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); canvas.removeEventListener("lostpointercapture", up); canvas.removeEventListener("keydown", keyboard);
    };
  }, [quality.dpr]);

  return <canvas ref={canvasRef} tabIndex={0} aria-label={zh ? "物理沙盒，点击添加小球，拖动投掷；按 Enter 添加" : "Physics sandbox: click to add, drag to throw; Enter adds a ball"} className="block h-full w-full touch-none focus-visible:outline-2 focus-visible:outline-[var(--accent)]" />;
}
