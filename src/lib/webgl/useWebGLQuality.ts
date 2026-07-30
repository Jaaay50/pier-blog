'use client';

import { useEffect, useState } from 'react';
import { getWebGLQuality, type WebGLQuality } from './capabilities';

/**
 * 客户端 WebGL 质量配置 hook。
 * SSR/水合前返回 null（调用方渲染占位），挂载后返回实际配置，
 * 并响应 prefers-reduced-motion 的实时变化。
 */
export function useWebGLQuality(): WebGLQuality | null {
  const [quality, setQuality] = useState<WebGLQuality | null>(null);

  useEffect(() => {
    const compute = () => setQuality(getWebGLQuality());
    compute();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', compute);
    return () => mq.removeEventListener('change', compute);
  }, []);

  return quality;
}
