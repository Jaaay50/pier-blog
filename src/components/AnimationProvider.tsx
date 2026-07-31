'use client';

import { useEffect } from 'react';
import { initLenis, destroyLenis } from '@/lib/animations/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// 注册 GSAP 插件
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化 Lenis（lenis.ts 不再自己起 RAF；统一由此处的 gsap.ticker 驱动）
    const lenis = initLenis();

    let tickerFn: ((time: number) => void) | null = null;

    if (lenis) {
      // 同步 Lenis 与 ScrollTrigger
      lenis.on('scroll', ScrollTrigger.update);

      // 单一驱动循环：gsap.ticker → lenis.raf
      tickerFn = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    }

    return () => {
      if (tickerFn) gsap.ticker.remove(tickerFn);
      destroyLenis();
    };
  }, []);

  return <>{children}</>;
}
