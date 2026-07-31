/**
 * Lenis Smooth Scroll 配置与实例管理
 */
import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function initLenis() {
  if (typeof window === 'undefined') return null;

  // 系统级减弱动效：不接管滚动，保留原生行为
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  if (lenisInstance) {
    return lenisInstance;
  }

  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
  });

  // RAF loop is intentionally NOT started here.
  // AnimationProvider drives Lenis via gsap.ticker to keep a single unified loop.

  return lenisInstance;
}

export function getLenis() {
  return lenisInstance;
}

export function destroyLenis() {
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}

export function scrollTo(target: string | number | HTMLElement, options?: { offset?: number; duration?: number }) {
  if (!lenisInstance) return;
  
  lenisInstance.scrollTo(target, {
    offset: options?.offset ?? 0,
    duration: options?.duration ?? 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
}
