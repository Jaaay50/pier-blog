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
    // 初始化 Lenis
    const lenis = initLenis();

    // 同步 Lenis 与 ScrollTrigger
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    }

    // View Transitions API 支持检测
    if ('startViewTransition' in document) {
      console.log('✨ View Transitions API supported');
    }

    return () => {
      destroyLenis();
      gsap.ticker.remove(() => {});
    };
  }, []);

  return <>{children}</>;
}
