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
 * 滚动触发淡入
 */
export function scrollFadeIn(
  element: gsap.TweenTarget,
  options?: {
    trigger?: gsap.DOMTarget;
    start?: string;
    end?: string;
    scrub?: boolean;
  }
) {
  return gsap.from(element, {
    opacity: 0,
    y: 60,
    duration: 1,
    scrollTrigger: {
      trigger: (options?.trigger ?? element) as gsap.DOMTarget,
      start: options?.start ?? 'top 85%',
      end: options?.end ?? 'top 60%',
      scrub: options?.scrub ?? false,
      toggleActions: 'play none none reverse',
    },
  });
}

/**
 * 视差滚动效果
 */
export function parallax(
  element: gsap.TweenTarget,
  options?: {
    speed?: number;
    trigger?: gsap.DOMTarget;
  }
) {
  const speed = options?.speed ?? 0.5;
  
  return gsap.to(element, {
    y: () => -window.innerHeight * speed,
    ease: 'none',
    scrollTrigger: {
      trigger: (options?.trigger ?? element) as gsap.DOMTarget,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}

/**
 * 磁性效果
 */
export function magneticEffect(
  element: HTMLElement,
  options?: {
    strength?: number;
  }
) {
  const strength = options?.strength ?? 0.3;

  const handleMouseMove = (e: MouseEvent) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    gsap.to(element, {
      x: deltaX,
      y: deltaY,
      duration: 0.5,
      ease: 'power2.out',
    });
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
 * 分段滚动动画（钉住元素）
 */
export function pinSection(
  element: gsap.DOMTarget,
  options?: {
    start?: string;
    end?: string;
    pinSpacing?: boolean;
  }
) {
  return ScrollTrigger.create({
    trigger: element,
    start: options?.start ?? 'top top',
    end: options?.end ?? '+=100%',
    pin: true,
    pinSpacing: options?.pinSpacing ?? true,
  });
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

/**
 * 文字逐字符动画
 */
export function splitText(
  element: HTMLElement,
  options?: {
    duration?: number;
    stagger?: number;
    ease?: string;
  }
) {
  const text = element.textContent || '';
  element.innerHTML = text
    .split('')
    .map((char) => `<span style="display: inline-block;">${char === ' ' ? '&nbsp;' : char}</span>`)
    .join('');

  const chars = element.querySelectorAll('span');

  return gsap.from(chars, {
    opacity: 0,
    y: 20,
    rotationX: -90,
    duration: options?.duration ?? 0.6,
    stagger: options?.stagger ?? 0.03,
    ease: options?.ease ?? 'power2.out',
  });
}
