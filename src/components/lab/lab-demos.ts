export const LAB_DEMO_IDS = [
  "fluid",
  "physics",
  "flow",
  "particles",
  "morph",
  "shader",
  "sdf",
  "cloth",
  "pathfinding",
  "raft",
  "audio",
  "geometry",
] as const;

export type LabDemoId = (typeof LAB_DEMO_IDS)[number];

export interface LabDemoMeta {
  id: LabDemoId;
  still: string;
  tall?: boolean;
  full?: boolean;
}

/** 画廊顺序与布局元信息；所有展示均提供真实静帧。 */
export const LAB_DEMOS: LabDemoMeta[] = [
  { id: "fluid", still: "/lab/fluid.webp", tall: true, full: true },
  { id: "physics", still: "/lab/physics.webp" },
  { id: "flow", still: "/lab/flow.webp" },
  { id: "particles", still: "/lab/particles.webp" },
  { id: "morph", still: "/lab/morph.webp" },
  { id: "shader", still: "/lab/shader.webp", tall: true, full: true },
  { id: "sdf", still: "/lab/sdf.webp", tall: true, full: true },
  { id: "cloth", still: "/lab/cloth.webp" },
  { id: "geometry", still: "/lab/geometry.webp" },
  { id: "pathfinding", still: "/lab/pathfinding.webp", tall: true, full: true },
  { id: "raft", still: "/lab/raft.webp", tall: true, full: true },
  { id: "audio", still: "/lab/audio.webp", full: true },
];
