"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { GuestbookEntry } from "@/lib/guestbook";
import {
  hitTest,
  scaleBottles,
  stepBottles,
  syncBottles,
  type TideBottle,
  type TideWorld,
} from "@/lib/guestbook-tide";
import { observeRenderGate } from "@/lib/webgl";

interface TidePalette {
  sky: string;
  mid: string;
  deep: string;
  wave: string;
  /** 玻璃壁：edge 是两侧暗部，core 是中间透光带，rim 是薄描边 */
  glassEdge: string;
  glassCore: string;
  glassRim: string;
  /** 高光条 */
  sheen: string;
  cork: string;
  corkShade: string;
  paper: string;
  paperShade: string;
  /** 瓶子入水处的涟漪 */
  ripple: string;
  accent: string;
}

interface GuestbookTideProps {
  entries: GuestbookEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  canvasLabel: string;
  /** 由调用方决定水面怎么占位；默认是独立的圆角卡片。 */
  className?: string;
}

function readPalette(node: HTMLElement): TidePalette {
  const styles = getComputedStyle(node);
  const accent = styles.getPropertyValue("--accent").trim() || "#d97757";
  const bg = styles.getPropertyValue("--bg-primary").trim() || "#faf9f5";
  const card = styles.getPropertyValue("--bg-card").trim() || "#f0eee6";
  const dark = document.documentElement.classList.contains("dark");
  return {
    sky: dark ? "#0c1a2e" : bg,
    mid: dark ? "#16324f" : card,
    deep: dark ? "#0a1220" : "#d7e4ea",
    wave: dark ? "rgba(106,155,204,0.28)" : "rgba(217,119,87,0.22)",
    glassEdge: dark ? "rgba(28,54,84,0.92)" : "rgba(146,176,196,0.58)",
    glassCore: dark ? "rgba(104,150,198,0.40)" : "rgba(255,255,255,0.78)",
    glassRim: dark ? "rgba(170,208,244,0.60)" : "rgba(108,144,170,0.65)",
    sheen: dark ? "rgba(226,241,255,0.55)" : "rgba(255,255,255,0.95)",
    cork: dark ? "#c2a181" : "#b08968",
    corkShade: dark ? "#8d7057" : "#8a6a4f",
    paper: dark ? "#f3ead8" : "#fffaf0",
    paperShade: dark ? "#cbb896" : "#e0d0b4",
    ripple: dark ? "rgba(170,208,244,0.34)" : "rgba(108,144,170,0.40)",
    accent,
  };
}

/**
 * 瓶身几何（单位空间，绘制时按 radius 缩放，所以每种瓶型只需要一份渐变）。
 * 三种瓶型由留言 id 派生，同一条留言永远拿到同一只瓶子。
 */
interface BottleShape {
  /** 瓶身半宽 */
  w: number;
  /** 瓶颈半宽 */
  neck: number;
  /** 瓶底 y */
  base: number;
  /** 肩部起点 y */
  shoulder: number;
  /** 瓶口 y */
  neckTop: number;
  /** 肩线曲率：越大越圆，越小越方 */
  curve: number;
  /** 瓶底圆角 */
  baseRadius: number;
}

const BOTTLE_SHAPES: readonly BottleShape[] = [
  // 经典圆肩
  { w: 0.72, neck: 0.19, base: 1.05, shoulder: -0.3, neckTop: -1.16, curve: 0.34, baseRadius: 0.16 },
  // 矮胖：宽身短颈，肩线很圆，像药瓶
  { w: 0.87, neck: 0.22, base: 0.96, shoulder: -0.08, neckTop: -0.94, curve: 0.5, baseRadius: 0.3 },
  // 高瘦：窄身长颈，肩线偏方，像酒瓶
  { w: 0.57, neck: 0.15, base: 1.2, shoulder: -0.5, neckTop: -1.36, curve: 0.16, baseRadius: 0.09 },
];

function shapeOf(variant: number): BottleShape {
  return BOTTLE_SHAPES[((variant % BOTTLE_SHAPES.length) + BOTTLE_SHAPES.length) % BOTTLE_SHAPES.length];
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function bottleSilhouette(ctx: CanvasRenderingContext2D, s: BottleShape): void {
  const rb = s.baseRadius;
  const grip = s.curve * 0.42;
  ctx.beginPath();
  ctx.moveTo(-s.w + rb, s.base);
  ctx.quadraticCurveTo(-s.w, s.base, -s.w, s.base - rb);
  ctx.lineTo(-s.w, s.shoulder + 0.1);
  ctx.bezierCurveTo(-s.w, s.shoulder - s.curve, -s.neck - grip, s.shoulder - s.curve * 0.88, -s.neck, s.neckTop + 0.3);
  ctx.lineTo(-s.neck, s.neckTop);
  ctx.lineTo(s.neck, s.neckTop);
  ctx.lineTo(s.neck, s.neckTop + 0.3);
  ctx.bezierCurveTo(s.neck + grip, s.shoulder - s.curve * 0.88, s.w, s.shoulder - s.curve, s.w, s.shoulder + 0.1);
  ctx.lineTo(s.w, s.base - rb);
  ctx.quadraticCurveTo(s.w, s.base, s.w - rb, s.base);
  ctx.closePath();
}

/** 渐变在单位空间创建，填充时随 CTM 缩放，所以每种瓶型全站共用一份 */
function makeGlassGradients(ctx: CanvasRenderingContext2D, palette: TidePalette): CanvasGradient[] {
  return BOTTLE_SHAPES.map((s) => {
    const g = ctx.createLinearGradient(-s.w, 0, s.w, 0);
    g.addColorStop(0, palette.glassEdge);
    g.addColorStop(0.3, palette.glassCore);
    g.addColorStop(0.66, palette.glassEdge);
    g.addColorStop(1, palette.glassRim);
    return g;
  });
}

function drawTide(ctx: CanvasRenderingContext2D, world: TideWorld, time: number, palette: TidePalette) {
  const { width, height } = world;
  const fill = ctx.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, palette.sky);
  fill.addColorStop(0.42, palette.mid);
  fill.addColorStop(1, palette.deep);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = palette.wave;
  ctx.lineWidth = 1.25;
  for (let band = 0; band < 4; band += 1) {
    ctx.beginPath();
    const base = height * (0.22 + band * 0.16);
    for (let x = 0; x <= width; x += 6) {
      const y =
        base +
        Math.sin(x * 0.011 + time * (0.35 + band * 0.08) + band) * (7 + band * 2.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  bottle: TideBottle,
  palette: TidePalette,
  glasses: CanvasGradient[],
  selected: boolean,
  hovered: boolean,
) {
  const body = bottle.radius;
  const lift = hovered || selected ? 1.1 : 1;
  const s = shapeOf(bottle.variant);
  const glass = glasses[((bottle.variant % glasses.length) + glasses.length) % glasses.length];

  ctx.save();
  ctx.translate(bottle.x, bottle.y);

  // 涟漪与选中光晕不跟着摇摆转：水面永远是平的
  ctx.save();
  ctx.scale(body, body);
  if (selected) {
    ctx.beginPath();
    ctx.ellipse(0, 0, s.w * 2.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = palette.ripple;
  ctx.lineWidth = 1 / body;
  ctx.beginPath();
  ctx.ellipse(0, s.base - 0.12, s.w * 1.55, 0.17, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, s.base - 0.06, s.w * 2.25, 0.26, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.rotate(bottle.angle);
  ctx.scale(body * lift, body * lift);
  const hair = 1 / (body * lift);

  bottleSilhouette(ctx, s);
  ctx.fillStyle = glass;
  ctx.fill();

  // 卷起来的信：椭圆端面 + 一道卷痕，不再是个三角形
  ctx.save();
  ctx.clip();
  ctx.translate(0, (s.shoulder + s.base) / 2 + 0.18);
  ctx.rotate(-0.26);
  // 比瓶身窄，两端圆头要露出来才像一卷信，贴边就成了一条横带
  const sw = s.w * 0.84;
  const sh = Math.min(0.26, s.w * 0.32);
  roundRectPath(ctx, -sw / 2, -sh / 2, sw, sh, sh / 2);
  ctx.fillStyle = palette.paper;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-sw / 2 + sh * 0.18, 0, sh * 0.18, sh * 0.44, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.paperShade;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sw / 2 - sh * 0.55, -sh * 0.3);
  ctx.lineTo(sw / 2 - sh * 0.55, sh * 0.3);
  ctx.strokeStyle = palette.paperShade;
  ctx.lineWidth = hair * 0.9;
  ctx.stroke();
  ctx.restore();

  // 高光：一道细长竖条 + 肩部一点，玻璃感靠这个
  ctx.globalAlpha = 0.5;
  roundRectPath(ctx, -s.w * 0.62, s.shoulder + 0.16, 0.1, (s.base - s.shoulder) * 0.62, 0.05);
  ctx.fillStyle = palette.sheen;
  ctx.fill();
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.ellipse(-s.neck * 0.5, s.shoulder - s.curve * 0.65, 0.07, 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  bottleSilhouette(ctx, s);
  ctx.strokeStyle = palette.glassRim;
  ctx.lineWidth = hair;
  ctx.stroke();

  // 瓶口唇环
  roundRectPath(ctx, -s.neck * 1.36, s.neckTop + 0.01, s.neck * 2.72, 0.1, 0.04);
  ctx.fillStyle = palette.glassEdge;
  ctx.fill();
  ctx.strokeStyle = palette.glassRim;
  ctx.lineWidth = hair * 0.8;
  ctx.stroke();

  // 软木塞：底边压一道暗线
  const cw = s.neck * 1.2;
  roundRectPath(ctx, -cw, s.neckTop - 0.23, cw * 2, 0.25, 0.06);
  ctx.fillStyle = palette.cork;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-cw * 0.92, s.neckTop - 0.02);
  ctx.lineTo(cw * 0.92, s.neckTop - 0.02);
  ctx.strokeStyle = palette.corkShade;
  ctx.lineWidth = hair * 1.2;
  ctx.stroke();

  ctx.restore();
}

export function GuestbookTide({
  entries,
  selectedId,
  onSelect,
  canvasLabel,
  className = "guestbook-hero relative overflow-hidden rounded-3xl border border-[var(--border)]",
}: GuestbookTideProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bottlesRef = useRef<TideBottle[]>([]);
  const worldRef = useRef<TideWorld>({ width: 0, height: 0 });
  const entriesRef = useRef(entries);
  const selectedRef = useRef(selectedId);
  const hoverRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  // 调色板只在主题切换时重读，避免每帧 getComputedStyle 触发样式重算。
  const paletteDirtyRef = useRef(true);
  const { resolvedTheme } = useTheme();

  // 同步最新值到 ref（不重建 RAF 循环）
  useEffect(() => {
    entriesRef.current = entries;
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  }, [entries, selectedId, onSelect]);

  useEffect(() => {
    paletteDirtyRef.current = true;
  }, [resolvedTheme]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    let running = true;
    let visible = true;
    let last = performance.now();
    let time = 0;
    let palette = readPalette(frame);
    let glasses: CanvasGradient[] | null = ctx ? makeGlassGradients(ctx, palette) : null;
    let raf = 0;

    const fit = () => {
      const rect = frame.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const previous = worldRef.current;
      const next = { width, height };
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (previous.width > 0) {
        bottlesRef.current = scaleBottles(bottlesRef.current, previous, next);
      }
      worldRef.current = next;
      bottlesRef.current = syncBottles(bottlesRef.current, entriesRef.current, next);
    };

    const paint = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible && ctx) {
        time += dt;
        const world = worldRef.current;
        // syncBottles 由 fit() 与 entries effect 负责，这里不必每帧重算。
        bottlesRef.current = stepBottles(bottlesRef.current, world, dt, time);
        if (paletteDirtyRef.current) {
          palette = readPalette(frame);
          glasses = makeGlassGradients(ctx, palette);
          paletteDirtyRef.current = false;
        }
        try {
          drawTide(ctx, world, time, palette);
          if (glasses) {
            for (const bottle of bottlesRef.current) {
              drawBottle(
                ctx,
                bottle,
                palette,
                glasses,
                bottle.id === selectedRef.current,
                bottle.id === hoverRef.current,
              );
            }
          }
        } catch {
          // jsdom 或缺 2D 原语时跳过这一帧，命中测试仍可用
        }
      }
      raf = window.requestAnimationFrame(paint);
    };

    const pointOnCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width) * worldRef.current.width,
        y: ((event.clientY - rect.top) / rect.height) * worldRef.current.height,
      };
    };

    const onMove = (event: PointerEvent) => {
      const point = pointOnCanvas(event);
      if (!point) return;
      const hit = hitTest(bottlesRef.current, point.x, point.y);
      hoverRef.current = hit?.id ?? null;
      canvas.style.cursor = hit ? "pointer" : "default";
    };

    const onClick = (event: PointerEvent) => {
      const point = pointOnCanvas(event);
      if (!point) return;
      const hit = hitTest(bottlesRef.current, point.x, point.y);
      onSelectRef.current(hit?.id ?? null);
    };

    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(frame);
    const ungate = observeRenderGate(frame, (active) => {
      visible = active;
    });
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onClick);
    window.addEventListener("resize", fit);
    raf = window.requestAnimationFrame(paint);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      resize.disconnect();
      ungate();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onClick);
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    if (worldRef.current.width === 0) return;
    bottlesRef.current = syncBottles(bottlesRef.current, entries, worldRef.current);
  }, [entries]);

  return (
    <div ref={frameRef} className={className} data-testid="guestbook-tide">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        data-testid="guestbook-canvas"
        role="img"
        aria-label={canvasLabel}
      />
    </div>
  );
}
