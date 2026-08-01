"use client";

import { useEffect, useRef } from "react";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — 流场粒子
 *
 * Canvas 2D 自写 curl noise 无散度流场：
 * - Value noise 的偏导数构造 curl（天然无散度，粒子不汇聚成点）
 * - 2500 粒子带长拖尾（alpha 叠加）
 * - 鼠标吸引/排斥切换（space 键或按钮）
 */

const PARTICLE_COUNT = 2500;
const TAIL_ALPHA = 0.04; // 拖尾残留率
const SPEED = 1.4;

function hash(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (d - a - c + a) * ux * uy;
}

/** curl noise：对 noise(x,y) 求偏导，天然无散度 */
function curl(x: number, y: number, t: number, eps = 0.01): [number, number] {
  const n = (px: number, py: number) => noise(px + t * 0.3, py + t * 0.2);
  const dy = (n(x, y + eps) - n(x, y - eps)) / (2 * eps);
  const dx = (n(x + eps, y) - n(x - eps, y)) / (2 * eps);
  return [dy, -dx]; // (∂n/∂y, -∂n/∂x)
}

interface FlowFieldProps {
  quality: WebGLQuality;
  attract: boolean; // true=吸引鼠标，false=排斥
  hue: number;
}

export default function FlowField({ quality, attract, hue }: FlowFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1, y: -1, active: false });
  const attractRef = useRef(attract);
  const hueRef = useRef(hue);

  useEffect(() => { attractRef.current = attract; }, [attract]);
  useEffect(() => { hueRef.current = hue; }, [hue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = Math.round(canvas.clientWidth * quality.dpr);
      canvas.height = Math.round(canvas.clientHeight * quality.dpr);
      // 清空拖尾
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 初始化粒子（随机分布）
    const count = Math.round(PARTICLE_COUNT * quality.particleMultiplier);
    const px = new Float32Array(count);
    const py = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      px[i] = Math.random() * canvas.width;
      py[i] = Math.random() * canvas.height;
    }

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      mouseRef.current.x = (e.clientX - rect.left) * scale;
      mouseRef.current.y = (e.clientY - rect.top) * scale;
      mouseRef.current.active = true;
    };
    const handleLeave = () => { mouseRef.current.active = false; };

    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerleave", handleLeave);

    let raf: number | null = null;
    let t = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      t += 0.006;

      const W = canvas.width, H = canvas.height;
      // 拖尾：半透明覆盖
      ctx.fillStyle = `rgba(0,0,0,${TAIL_ALPHA})`;
      ctx.fillRect(0, 0, W, H);

      const scale = 0.004; // 噪声空间缩放
      const h = hueRef.current;

      ctx.lineWidth = quality.dpr;

      for (let i = 0; i < count; i++) {
        const [cx, cy] = curl(px[i] * scale, py[i] * scale, t);

        let vx = cx * SPEED * W * scale * 120;
        let vy = cy * SPEED * W * scale * 120;

        // 鼠标影响
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - px[i];
          const dy = mouseRef.current.y - py[i];
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const str = Math.min(200 / dist, 8) * (attractRef.current ? 1 : -1);
          vx += (dx / dist) * str;
          vy += (dy / dist) * str;
        }

        const ox = px[i], oy = py[i];
        px[i] += vx;
        py[i] += vy;

        // 粒子跑出画面：随机重置
        if (px[i] < 0 || px[i] > W || py[i] < 0 || py[i] > H) {
          px[i] = Math.random() * W;
          py[i] = Math.random() * H;
          continue;
        }

        // 速度大小映射亮度
        const spd = Math.sqrt(vx * vx + vy * vy);
        const alpha = Math.min(0.6, 0.15 + spd * 0.05);

        ctx.strokeStyle = `hsla(${h + spd * 4},75%,65%,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(px[i], py[i]);
        ctx.stroke();
      }
    };

    const startLoop = () => { if (raf === null) raf = requestAnimationFrame(frame); };
    const stopLoop = () => { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } };
    startLoop();
    const stopGate = observeRenderGate(canvas, (a) => (a ? startLoop() : stopLoop()));

    return () => {
      stopGate(); stopLoop(); ro.disconnect();
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
  }, [quality]);

  return <canvas ref={canvasRef} className="h-full w-full touch-none" />;
}
