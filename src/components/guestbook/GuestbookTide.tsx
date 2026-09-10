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
  glass: string;
  glassDark: string;
  cork: string;
  paper: string;
  accent: string;
}

interface GuestbookTideProps {
  entries: GuestbookEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  canvasLabel: string;
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
    glass: dark ? "rgba(138,180,221,0.28)" : "rgba(255,255,255,0.45)",
    glassDark: dark ? "rgba(42,72,104,0.85)" : "rgba(196,168,142,0.55)",
    cork: dark ? "#c4a484" : "#b08968",
    paper: dark ? "#f0e6d4" : "#fff8ee",
    accent,
  };
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
  selected: boolean,
  hovered: boolean,
) {
  ctx.save();
  ctx.translate(bottle.x, bottle.y);
  ctx.rotate(bottle.angle);
  const scale = hovered || selected ? 1.12 : 1;
  ctx.scale(scale, scale);
  const body = bottle.radius;

  if (selected) {
    ctx.beginPath();
    ctx.ellipse(0, 2, body * 1.45, body * 1.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.ellipse(0, body * 0.15, body * 0.72, body * 1.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.glassDark;
  ctx.fill();
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.rect(-body * 0.22, -body * 1.15, body * 0.44, body * 0.42);
  ctx.fillStyle = palette.glassDark;
  ctx.fill();

  ctx.beginPath();
  const corkX = -body * 0.2;
  const corkY = -body * 1.32;
  const corkW = body * 0.4;
  const corkH = body * 0.22;
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(corkX, corkY, corkW, corkH, 3);
  } else {
    ctx.rect(corkX, corkY, corkW, corkH);
  }
  ctx.fillStyle = palette.cork;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(body * 0.08, -body * 0.35);
  ctx.lineTo(body * 0.55, -body * 0.05);
  ctx.lineTo(body * 0.12, body * 0.2);
  ctx.closePath();
  ctx.fillStyle = palette.paper;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-body * 0.22, -body * 0.1, body * 0.18, body * 0.45, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = palette.glass;
  ctx.fill();

  ctx.restore();
}

export function GuestbookTide({ entries, selectedId, onSelect, canvasLabel }: GuestbookTideProps) {
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
          paletteDirtyRef.current = false;
        }
        try {
          drawTide(ctx, world, time, palette);
          for (const bottle of bottlesRef.current) {
            drawBottle(
              ctx,
              bottle,
              palette,
              bottle.id === selectedRef.current,
              bottle.id === hoverRef.current,
            );
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
    <div
      ref={frameRef}
      className="guestbook-tide relative overflow-hidden rounded-3xl border border-[var(--border)]"
      data-testid="guestbook-tide"
    >
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
