/**
 * GSAP 动画工具函数库
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 淡入上升动画
 */
export function fadeInUp(
  element: gsap.TweenTarget,
  options?: {
    duration?: number;
    delay?: number;
    y?: number;
    stagger?: number;
  }
) {
  return gsap.from(element, {
    opacity: 0,
    y: options?.y ?? 40,
    duration: options?.duration ?? 0.8,
    delay: options?.delay ?? 0,
    stagger: options?.stagger ?? 0,
    ease: 'power3.out',
  });
}

/**
 * 磁性效果（用 quickTo 替代每次 mousemove 创建 tween）
 */
export function magneticEffect(
  element: HTMLElement,
  options?: {
    strength?: number;
  }
) {
  const strength = options?.strength ?? 0.3;

  // quickTo 只创建一次，后续调用仅更新目标值
  const quickX = gsap.quickTo(element, 'x', { duration: 0.5, ease: 'power2.out' });
  const quickY = gsap.quickTo(element, 'y', { duration: 0.5, ease: 'power2.out' });

  const handleMouseMove = (e: MouseEvent) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    quickX((e.clientX - centerX) * strength);
    quickY((e.clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: 'elastic.out(1, 0.3)',
    });
  };

  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
}

/**
 * FLIP 动画辅助函数
 */
export function flip(
  element: HTMLElement,
  callback: () => void,
  options?: {
    duration?: number;
    ease?: string;
  }
) {
  const first = element.getBoundingClientRect();
  
  callback();
  
  requestAnimationFrame(() => {
    const last = element.getBoundingClientRect();
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    const deltaW = first.width / last.width;
    const deltaH = first.height / last.height;

    gsap.fromTo(
      element,
      {
        x: deltaX,
        y: deltaY,
        scaleX: deltaW,
        scaleY: deltaH,
      },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: options?.duration ?? 0.6,
        ease: options?.ease ?? 'power2.inOut',
      }
    );
  });
}
