'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';

interface TransitionLinkProps
  extends Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> {
  href: string;
}

/**
 * 支持 View Transitions 的增强 Link 组件
 */
export function TransitionLink({
  href,
  children,
  className,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 如果浏览器不支持 View Transitions 或按住了修饰键，使用默认行为
    if (
      !('startViewTransition' in document) ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    e.preventDefault();

    // 使用 View Transitions API（类型由 @types/dom-view-transitions 提供）
    document.startViewTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </Link>
  );
}
