"use client";

import { useEffect, useRef } from "react";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — 物理沙盒
 *
 * Canvas 2D 自写 Verlet 积分 + 空间哈希碰撞检测：
 * - 点击生成小球（带初速度）
 * - 拖拽投掷（释放时速度 = 最近两帧位移 / dt）
 * - 重力开关
 * - 球与球之间弹性碰撞（空间哈希 O(n)）
 * - 边界约束（包围盒反弹）
 */

const RADIUS = 12;
const RESTITUTION = 0.75;
const FRICTION = 0.998;
const GRAVITY = 800;

interface Ball {
  x: number;
  y: number;
  px: number; // previous x（Verlet）
  py: number;
  vx: number; // 当前帧速度（从 Verlet 推导，用于碰撞）
  vy: number;
  r: number;
  hue: number;
}

function createBall(x: number, y: number, vx: number, vy: number): Ball {
  const dt = 0.016;
  return {
    x,
    y,
    px: x - vx * dt,
    py: y - vy * dt,
    vx,
    vy,
    r: RADIUS + Math.random() * 6,
    hue: Math.random() * 360,
  };
}

interface PhysicsSandboxProps {
  quality: WebGLQuality;
  gravityOn: boolean;
  onBallCount: (n: number) => void;
}

export default function PhysicsSandbox({ quality, gravityOn, onBallCount }: PhysicsSandboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const gravRef = useRef(gravityOn);
  const dragRef = useRef<{
    active: boolean;
    ball: Ball | null;
    prevX: number;
    prevY: number;
    prevT: number;
    launchVX: number;
    launchVY: number;
  }>({ active: false, ball: null, prevX: 0, prevY: 0, prevT: 0, launchVX: 0, launchVY: 0 });

  useEffect(() => {
    gravRef.current = gravityOn;
  }, [gravityOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth * quality.dpr;
      canvas.height = canvas.clientHeight * quality.dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 初始几颗球
    const initialBalls = 5;
    for (let i = 0; i < initialBalls; i++) {
      const x = canvas.width * (0.2 + Math.random() * 0.6);
      const y = canvas.height * (0.1 + Math.random() * 0.3);
      ballsRef.current.push(createBall(x, y, (Math.random() - 0.5) * 200, Math.random() * 100));
    }
    onBallCount(ballsRef.current.length);

    // --- 鼠标/触摸 ---
    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
    };

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      // 查找击中的球
      let hit: Ball | null = null;
      for (const b of ballsRef.current) {
        const dx = b.x - x, dy = b.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < b.r + 4) { hit = b; break; }
      }
      if (hit) {
        dragRef.current = { active: true, ball: hit, prevX: x, prevY: y, prevT: performance.now(), launchVX: 0, launchVY: 0 };
      } else {
        // 空地点击：生成新球（带指向中心的初速）
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const dx = cx - x, dy = cy - y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 300 + Math.random() * 200;
        const nb = createBall(x, y, dx / len * speed, dy / len * speed);
        ballsRef.current.push(nb);
        if (ballsRef.current.length > 40) ballsRef.current.splice(0, 1);
        onBallCount(ballsRef.current.length);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || !d.ball) return;
      const { x, y } = getPos(e);
      const now = performance.now();
      const dt = Math.max(1, now - d.prevT);
      d.launchVX = (x - d.prevX) / dt * 1000;
      d.launchVY = (y - d.prevY) / dt * 1000;
      d.prevX = x; d.prevY = y; d.prevT = now;
      d.ball.x = x; d.ball.y = y;
      d.ball.px = x; d.ball.py = y; // 拖拽时锁位
    };

    const onPointerUp = () => {
      const d = dragRef.current;
      if (d.active && d.ball) {
        const dt = 0.016;
        d.ball.px = d.ball.x - d.launchVX * dt;
        d.ball.py = d.ball.y - d.launchVY * dt;
      }
      dragRef.current.active = false;
      dragRef.current.ball = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);

    // --- 空间哈希 ---
    const CELL = RADIUS * 3;
    const collide = (balls: Ball[]) => {
      const map = new Map<number, Ball[]>();
      const key = (b: Ball) => Math.floor(b.x / CELL) * 10000 + Math.floor(b.y / CELL);
      for (const b of balls) {
        const k = key(b);
        for (let dk = -10001; dk <= 10001; dk += 10000)
          for (let dl = -1; dl <= 1; dl++) {
            const ck = k + dk + dl;
            if (!map.has(ck)) map.set(ck, []);
            if (dk === 0 && dl === 0) map.get(ck)!.push(b);
          }
      }
      for (const [, cell] of map) {
        for (let i = 0; i < cell.length; i++) {
          for (let j = i + 1; j < cell.length; j++) {
            const a = cell[i], b = cell[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = a.r + b.r;
            if (dist < minD && dist > 0.001) {
              const nx = dx / dist, ny = dy / dist;
              const overlap = minD - dist;
              a.x -= nx * overlap * 0.5; a.y -= ny * overlap * 0.5;
              b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
              // 速度交换（等质量弹性碰撞）
              const avx = (a.x - a.px) / 0.016, avy = (a.y - a.py) / 0.016;
              const bvx = (b.x - b.px) / 0.016, bvy = (b.y - b.py) / 0.016;
              const dot = (avx - bvx) * nx + (avy - bvy) * ny;
              if (dot > 0) {
                const imp = dot * RESTITUTION;
                a.px = a.x - (avx - imp * nx) * 0.016;
                a.py = a.y - (avy - imp * ny) * 0.016;
                b.px = b.x - (bvx + imp * nx) * 0.016;
                b.py = b.y - (bvy + imp * ny) * 0.016;
              }
            }
          }
        }
      }
    };

    let raf: number | null = null;
    let lastT: number | null = null;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((lastT === null ? 16 : t - lastT) / 1000, 0.032);
      lastT = t;

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const balls = ballsRef.current;
      const drag = dragRef.current;

      for (const b of balls) {
        if (drag.active && drag.ball === b) continue; // 拖拽中不物理更新
        // Verlet 积分（带速度阻尼）
        const ax = 0;
        const ay = gravRef.current ? GRAVITY : 0;
        const nx = b.x + (b.x - b.px) * FRICTION + ax * dt * dt;
        const ny = b.y + (b.y - b.py) * FRICTION + ay * dt * dt;
        b.px = b.x; b.py = b.y;
        b.x = nx; b.y = ny;

        // 边界反弹
        if (b.x < b.r) { b.x = b.r; b.px = b.x + (b.x - b.px) * RESTITUTION; }
        if (b.x > W - b.r) { b.x = W - b.r; b.px = b.x + (b.x - b.px) * RESTITUTION; }
        if (b.y < b.r) { b.y = b.r; b.py = b.y + (b.y - b.py) * RESTITUTION; }
        if (b.y > H - b.r) { b.y = H - b.r; b.py = b.y + (b.y - b.py) * RESTITUTION; }
      }

      collide(balls);

      // 绘制
      for (const b of balls) {
        const spd = Math.sqrt((b.x - b.px) ** 2 + (b.y - b.py) ** 2) / dt / 200;
        const lightness = 45 + Math.min(spd * 20, 25);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
        grad.addColorStop(0, `hsl(${b.hue}, 70%, ${lightness + 20}%)`);
        grad.addColorStop(1, `hsl(${b.hue}, 70%, ${lightness}%)`);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    };

    const startLoop = () => { if (raf === null) { lastT = null; raf = requestAnimationFrame(frame); } };
    const stopLoop = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } };
    startLoop();
    const stopGate = observeRenderGate(canvas, (a) => (a ? startLoop() : stopLoop()));

    return () => {
      stopGate(); stopLoop(); ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      ballsRef.current = [];
    };
  }, [quality, onBallCount]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      style={{ cursor: "crosshair" }}
    />
  );
}
