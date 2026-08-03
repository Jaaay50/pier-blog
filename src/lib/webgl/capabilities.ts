/**
 * WebGL 能力检测与设备质量分级
 *
 * 输出统一的 WebGLQuality 配置，供所有 WebGL 组件消费：
 * - webglSupported: context 能否创建（失败 → 静态降级）
 * - reducedMotion: 用户系统级减弱动效偏好（→ 静态降级）
 * - tier: 设备分级 high / medium / low（low → 静态降级）
 * - dpr / particleMultiplier / mouseInteraction: 按分级缩放的渲染参数
 */

export type WebGLTier = 'high' | 'medium' | 'low';

export interface WebGLQuality {
  webglSupported: boolean;
  reducedMotion: boolean;
  tier: WebGLTier;
  /** 渲染像素比（high: 最高 1.5，medium/low: 1） */
  dpr: number;
  /** 粒子数量缩放系数 */
  particleMultiplier: number;
  /** 是否启用鼠标跟随/斥力交互 */
  mouseInteraction: boolean;
  /** false 时组件应渲染静态降级背景，不创建 WebGL context */
  enabled: boolean;
}

let cachedSupport: boolean | null = null;

/** 检测 WebGL2/WebGL1 context 是否可创建（结果缓存） */
export function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  if (cachedSupport !== null) return cachedSupport;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cachedSupport = !!gl;
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 设备分级：结合内存、核心数与指针类型的启发式判断 */
export function getDeviceTier(): WebGLTier {
  if (typeof window === 'undefined') return 'low';

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8; // 未暴露时按桌面级假设
  const cores = navigator.hardwareConcurrency ?? 8;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  if (memory <= 2 || cores <= 2) return 'low';
  if (coarsePointer || memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}

/** 汇总当前环境的 WebGL 质量配置 */
export function getWebGLQuality(): WebGLQuality {
  const webglSupported = detectWebGLSupport();
  const reducedMotion = prefersReducedMotion();
  const tier = getDeviceTier();
  const coarsePointer =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches;

  const profile = {
    // high tier dpr 上限 1.5（10.8 从 2 收紧）：shader 流体/粒子是低频视觉，
    // 1.5× 与 2× 肉眼几乎无差，但像素量降 44%（1.5²/2²），
    // 直接缓解 Hero 双 canvas（Galaxy + ParticleTitle）同屏的 GPU 负担
    high: { dpr: Math.min(window.devicePixelRatio || 1, 1.5), particleMultiplier: 1 },
    medium: { dpr: 1, particleMultiplier: 0.6 },
    low: { dpr: 1, particleMultiplier: 0.35 },
  }[tier];

  return {
    webglSupported,
    reducedMotion,
    tier,
    dpr: profile.dpr,
    particleMultiplier: profile.particleMultiplier,
    mouseInteraction: !coarsePointer,
    enabled: webglSupported && !reducedMotion && tier !== 'low',
  };
}
