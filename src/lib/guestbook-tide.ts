import type { GuestbookEntry } from "./guestbook";

export interface TideWorld {
  width: number;
  height: number;
}

export interface TideBottle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  phase: number;
  drift: number;
  age: number;
  /** 瓶型编号，由 id 派生：同一条留言永远是同一只瓶子 */
  variant: number;
}

/** 可用瓶型数量，与 GuestbookTide 里的 BOTTLE_SHAPES 对应 */
export const BOTTLE_VARIANTS = 3;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PADDING = 56;
const MAX_DT = 1 / 30;

export function hash32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(seed: number, salt: number): number {
  return ((seed ^ Math.imul(salt, 2654435761)) >>> 0) / 4294967296;
}

export function bottleAge(createdAt: string, now = Date.now()): number {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 0.5;
  const days = Math.max(0, (now - created) / 86_400_000);
  return Math.min(1, days / 60);
}

export function createBottle(
  entry: GuestbookEntry,
  index: number,
  total: number,
  world: TideWorld,
  now = Date.now(),
  spawn?: { x: number; y: number },
): TideBottle {
  const seed = hash32(entry.id);
  const count = Math.max(1, total);
  const spreadX = Math.max(80, world.width / 2 - PADDING);
  const spreadY = Math.max(60, world.height / 2 - PADDING);
  const radiusNorm = Math.sqrt((index + 0.5) / count);
  const angle = index * GOLDEN_ANGLE + unit(seed, 17) * 0.6;
  const x = spawn?.x ?? world.width / 2 + Math.cos(angle) * radiusNorm * spreadX * 1.05;
  const y = spawn?.y ?? world.height / 2 + Math.sin(angle) * radiusNorm * spreadY * 0.72;
  const age = bottleAge(entry.createdAt, now);
  return {
    id: entry.id,
    x: clamp(x, PADDING, world.width - PADDING),
    y: clamp(y, PADDING, world.height - PADDING),
    vx: (unit(seed, 3) - 0.5) * 8,
    vy: (unit(seed, 5) - 0.5) * 5,
    angle: (unit(seed, 7) - 0.5) * 0.35,
    radius: 18 + (1 - age) * 8 + unit(seed, 11) * 4,
    phase: unit(seed, 13) * Math.PI * 2,
    drift: 0.55 + unit(seed, 19) * 0.7,
    age,
    variant: seed % BOTTLE_VARIANTS,
  };
}

export function syncBottles(
  previous: TideBottle[],
  entries: GuestbookEntry[],
  world: TideWorld,
  now = Date.now(),
): TideBottle[] {
  const kept = new Map(previous.map((bottle) => [bottle.id, bottle]));
  const next: TideBottle[] = [];
  entries.forEach((entry, index) => {
    const existing = kept.get(entry.id);
    if (existing) {
      next.push({
        ...existing,
        age: bottleAge(entry.createdAt, now),
      });
      return;
    }
    const spawn = previous.length > 0
      ? { x: world.width / 2, y: Math.min(world.height - PADDING, world.height * 0.82) }
      : undefined;
    next.push(createBottle(entry, index, entries.length, world, now, spawn));
  });
  return next;
}

export function scaleBottles(bottles: TideBottle[], from: TideWorld, to: TideWorld): TideBottle[] {
  if (from.width === to.width && from.height === to.height) return bottles;
  const sx = to.width / Math.max(1, from.width);
  const sy = to.height / Math.max(1, from.height);
  return bottles.map((bottle) => ({
    ...bottle,
    x: clamp(bottle.x * sx, PADDING, to.width - PADDING),
    y: clamp(bottle.y * sy, PADDING, to.height - PADDING),
  }));
}

export function stepBottles(
  bottles: TideBottle[],
  world: TideWorld,
  dt: number,
  time: number,
): TideBottle[] {
  const step = Math.min(MAX_DT, Math.max(0, dt));
  if (step === 0 || bottles.length === 0) return bottles;

  const next = bottles.map((bottle) => {
    const sway = Math.sin(time * bottle.drift + bottle.phase);
    const heave = Math.cos(time * bottle.drift * 0.73 + bottle.phase * 1.3);
    let vx = bottle.vx + sway * 6 * step;
    let vy = bottle.vy + heave * 4 * step;
    vx *= 0.986;
    vy *= 0.986;
    let x = bottle.x + vx * step * 12;
    let y = bottle.y + vy * step * 10;
    const minX = PADDING;
    const maxX = world.width - PADDING;
    const minY = PADDING;
    const maxY = world.height - PADDING;
    if (x < minX) {
      x = minX;
      vx = Math.abs(vx) * 0.4;
    } else if (x > maxX) {
      x = maxX;
      vx = -Math.abs(vx) * 0.4;
    }
    if (y < minY) {
      y = minY;
      vy = Math.abs(vy) * 0.4;
    } else if (y > maxY) {
      y = maxY;
      vy = -Math.abs(vy) * 0.4;
    }
    return {
      ...bottle,
      x,
      y,
      vx,
      vy,
      angle: bottle.angle * 0.98 + sway * 0.08,
    };
  });

  for (let i = 0; i < next.length; i += 1) {
    for (let j = i + 1; j < next.length; j += 1) {
      const a = next[i];
      const b = next[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = a.radius + b.radius + 8;
      const distSq = dx * dx + dy * dy;
      if (distSq === 0 || distSq >= minDist * minDist) continue;
      const dist = Math.sqrt(distSq);
      const overlap = (minDist - dist) / dist;
      const nx = dx * overlap * 0.5;
      const ny = dy * overlap * 0.5;
      a.x -= nx;
      a.y -= ny;
      b.x += nx;
      b.y += ny;
    }
  }

  return next;
}

export function hitTest(bottles: TideBottle[], x: number, y: number): TideBottle | null {
  let best: TideBottle | null = null;
  let bestDist = Infinity;
  for (const bottle of bottles) {
    const dx = x - bottle.x;
    const dy = y - bottle.y;
    const reach = bottle.radius * 1.35;
    const dist = dx * dx + dy * dy;
    if (dist <= reach * reach && dist < bestDist) {
      best = bottle;
      bestDist = dist;
    }
  }
  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
