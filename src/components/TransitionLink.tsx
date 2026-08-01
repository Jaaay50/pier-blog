'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';

interface TransitionLinkProps
  extends Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> {
  href: string;
}

/**
 * 支持 View Transitions 的增强 Link。
 *
 * 关键修复：router.push 是异步的——直接塞进 startViewTransition 回调，
 * 会导致"新快照"在路由真正 commit 前就被截取（截到的还是旧页面），
 * 表现为一段无效的交叉淡入 + 内容硬弹入（明显卡顿）。
 * 现在回调返回 Promise，等新路由 commit（pathname 变化触发 effect）后才 resolve，
 * 浏览器在正确时机截取新页面快照，转场真实生效。
 * 超时保护：600ms 未完成则跳过动画，避免慢网络下页面长时间冻结。
 */

// 模块级 resolver：新页面任意 TransitionLink 实例 mount 后即可结算当前转场
let pendingResolve: (() => void) | null = null;

function resolvePending() {
  if (pendingResolve) {
    pendingResolve();
    pendingResolve = null;
  }
}

export function TransitionLink({
  href,
  children,
  className,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 新路由 commit（新页面组件树 mount / pathname 变化）后结算转场
  useEffect(() => {
    resolvePending();
  }, [pathname]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 不支持 / 修饰键 / 减弱动效：走默认导航
    if (
      !('startViewTransition' in document) ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    // 同一路由：不做转场，仅触发导航（滚回顶部）
    if (href === pathname) {
      e.preventDefault();
      router.push(href);
      return;
    }

    e.preventDefault();

    // 上一个转场未结算则先结算，避免 resolver 悬挂
    resolvePending();

    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          pendingResolve = resolve;
          router.push(href);
        })
    );

    // 慢导航保护：超时则跳过动画并立即结算，内容就绪后直接显示
    const timeout = window.setTimeout(() => {
      transition.skipTransition();
      resolvePending();
    }, 600);

    transition.finished
      .finally(() => window.clearTimeout(timeout))
      .catch(() => {});
  };

  return (
    <Link href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </Link>
  );
}
