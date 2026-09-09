import { describe, expect, it } from "vitest";
import { collideBalls, PHYSICS_STEP, stepPhysics, type PhysicsBall } from "./PhysicsSandbox";
import { flowCurl, flowDisplacement, flowNoise } from "./FlowField";
import { fluidPointerPosition } from "./FluidSim";
import { generateCube, generateSphere, generateTorus, generateWave, morphDelta } from "./Morph3D";

function ball(x: number, y: number, vx = 0): PhysicsBall { return { x, y, vx, vy: 0, r: 15, hue: 200 }; }

describe("lab numerical regressions", () => {
  it("resolves same-cell and adjacent-cell contacts once, with separating velocities", () => {
    for (const x of [100, 35]) {
      const a = ball(x, 100, 40), b = ball(x + 10, 100, -40);
      collideBalls([a, b]);
      expect(Math.abs(b.x - a.x)).toBeCloseTo(30);
      expect(a.vx).toBeLessThan(0); expect(b.vx).toBeGreaterThan(0);
      expect(a.vx + b.vx).toBeCloseTo(0);
    }
  });
  it("keeps a dragged ball fixed and separates coincident centers", () => {
    const a = ball(100, 100), b = ball(100, 100);
    collideBalls([a, b], a);
    expect(a.x).toBe(100); expect(a.y).toBe(100);
    expect(b.x - a.x).toBeCloseTo(30);
  });
  it("uses the same trajectory at 30, 60 and 120 display FPS", () => {
    const simulate = (fps: number) => {
      const balls = [ball(80, 60, 60)]; let accumulated = 0;
      for (let i = 0; i < fps * 2; i++) {
        accumulated += 1 / fps;
        while (accumulated + 1e-10 >= PHYSICS_STEP) { stepPhysics(balls, 800, 500, true); accumulated -= PHYSICS_STEP; }
      }
      return balls[0];
    };
    expect(simulate(30)).toEqual(simulate(60)); expect(simulate(60)).toEqual(simulate(120));
  });
  it("keeps particles finite and within bounds after long running contacts", () => {
    const balls = [ball(35, 35, 500), ball(65, 35, -500), ball(50, 65)];
    for (let i = 0; i < 1200; i++) stepPhysics(balls, 200, 160, true);
    for (const b of balls) { expect(Number.isFinite(b.x + b.y + b.vx + b.vy)).toBe(true); expect(b.x).toBeGreaterThanOrEqual(b.r); expect(b.y).toBeLessThanOrEqual(160 - b.r); }
  });
  it("maps the center under viewport offsets and scrolling to the local fluid center", () => {
    expect(fluidPointerPosition(680, 530, { left: 280, top: 270, width: 800, height: 520 })).toEqual({ x: 0.5, y: 0.5 });
    expect(fluidPointerPosition(680, 60, { left: 280, top: -200, width: 800, height: 520 })).toEqual({ x: 0.5, y: 0.5 });
    expect(fluidPointerPosition(-30, 800, { left: 0, top: 0, width: 800, height: 520 })).toEqual({ x: 0, y: 0 });
  });
  it("interpolates noise continuously across grid boundaries", () => {
    for (let x = -3; x <= 3; x++) for (const y of [-2.4, 0.4, 1.7]) expect(Math.abs(flowNoise(x - 1e-6, y) - flowNoise(x + 1e-6, y))).toBeLessThan(1e-4);
    const curl = flowCurl(1, 0.4, 0); expect(Math.hypot(...curl)).toBeLessThan(5);
  });
  it("scales flow movement by elapsed time, not display refresh rate or DPR", () => {
    const [x30, y30] = flowDisplacement(90, -30, 1 / 30), [x60, y60] = flowDisplacement(90, -30, 1 / 60);
    expect(x30).toBeCloseTo(x60 * 2); expect(y30).toBeCloseTo(y60 * 2);
    expect(Math.hypot(...flowDisplacement(10000, 10000, 1 / 60))).toBeLessThanOrEqual(3.0001);
  });
  it("advances morph time before replacing its previous timestamp, with a bounded resume", () => {
    expect(morphDelta(null, 100)).toBe(0); expect(morphDelta(100, 116)).toBeCloseTo(0.016); expect(morphDelta(100, 10000)).toBe(0.05);
    let progress = 0; for (let i = 1; i <= 120; i++) progress += morphDelta((i - 1) * 16, i * 16) * 0.8;
    expect(progress).toBeGreaterThan(1);
  });
  it("uses deterministic, equal-sized finite buffers for every shape", () => {
    for (const generate of [generateCube, generateSphere, generateTorus, generateWave]) {
      const values = generate(12); expect(values).toHaveLength(12 * 12 * 3); expect([...values].every(Number.isFinite)).toBe(true); expect(values).toEqual(generate(12));
    }
  });
});
