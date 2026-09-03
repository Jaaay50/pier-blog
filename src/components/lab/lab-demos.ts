export const LAB_DEMO_IDS = [
  "fluid",
  "physics",
  "flow",
  "particles",
  "morph",
  "shader",
] as const;

export type LabDemoId = (typeof LAB_DEMO_IDS)[number];

export interface LabDemoMeta {
  id: LabDemoId;
  still: string;
  tall?: boolean;
  full?: boolean;
}

/** 服务端 figure 顺序：旗舰流体全宽 → 物理/流场 → 粒子/形变 → shader 全宽。 */
export const LAB_DEMOS: LabDemoMeta[] = [
  { id: "fluid", still: "/lab/fluid.webp", tall: true, full: true },
  { id: "physics", still: "/lab/physics.webp" },
  { id: "flow", still: "/lab/flow.webp" },
  { id: "particles", still: "/lab/particles.webp" },
  { id: "morph", still: "/lab/morph.webp" },
  { id: "shader", still: "/lab/shader.webp", tall: true, full: true },
];
