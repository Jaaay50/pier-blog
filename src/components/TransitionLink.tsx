'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';

interface TransitionLinkProps
  extends Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> {
  href: string;
}

/**
 * 支持 View Transitions 的增强 Link（locale-aware）。
 *
 * 基于 @/i18n/navigation 的 Link/useRouter/usePathname：
 * href 写不带 locale 前缀的路径（如 /blog），运行时自动补当前 locale。
 *
 * 转场时序：router.push 是异步的，回调返回 Promise 并在新路由
 * commit（pathname 或 locale 变化）后 resolve，浏览器才截取新页面快照。
 * 600ms 超时保护：慢导航直接跳过动画。
 *
 * 模块级 resolver 同时供 LanguageToggle 复用：语言切换时 pathname 不变
 * （@/i18n/navigation 返回不带 locale 前缀的路径），必须监听 locale。
 */

// 模块级 resolver：新页面任意 TransitionLink 实例 mount 后即可结算当前转场
let pendingResolve: (() => void) | null = null;

/** 结算当前挂起的转场（新路由 commit 后调用） */
export function resolvePendingViewTransition() {
  if (pendingResolve) {
    pendingResolve();
    pendingResolve = null;
  }
}

/** 登记一个待结算转场；返回是否已占用（供 LanguageToggle 判断是否需要自处理） */
export function armViewTransitionResolver(resolve: () => void) {
  pendingResolve = resolve;
}

export function TransitionLink({
  href,
  children,
  className,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  // 新路由 commit（pathname 或 locale 变化）后结算转场
  useEffect(() => {
    resolvePendingViewTransition();
  }, [pathname, locale]);

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
    resolvePendingViewTransition();

    const transition = document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          armViewTransitionResolver(resolve);
          router.push(href);
        })
    );

    // 慢导航保护：超时则跳过动画并立即结算，内容就绪后直接显示
    const timeout = window.setTimeout(() => {
      transition.skipTransition();
      resolvePendingViewTransition();
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
