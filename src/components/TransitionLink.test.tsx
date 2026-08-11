// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolvePendingViewTransition,
  TransitionLink,
} from './TransitionLink';

const mockRouterPush = vi.fn();
let currentPathname = '/currents';
let currentLocale = 'zh';

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => currentPathname,
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => currentLocale,
}));

function installViewTransitionMock() {
  let updatePromise: Promise<void> | undefined;
  const skipTransition = vi.fn();
  const startViewTransition = vi.fn((update: () => void | Promise<void>) => {
    updatePromise = Promise.resolve(update());
    return {
      ready: Promise.resolve(),
      updateCallbackDone: updatePromise,
      finished: updatePromise,
      skipTransition,
    };
  });

  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: startViewTransition,
  });

  return {
    startViewTransition,
    skipTransition,
    getUpdatePromise: () => updatePromise,
  };
}

function installAnimationFrameMock() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  const cancelAnimationFrame = vi.fn((id: number) => {
    callbacks.delete(id);
  });

  Object.defineProperties(window, {
    requestAnimationFrame: {
      configurable: true,
      value: requestAnimationFrame,
    },
    cancelAnimationFrame: {
      configurable: true,
      value: cancelAnimationFrame,
    },
  });

  return {
    requestAnimationFrame,
    runNextFrame() {
      const next = callbacks.entries().next().value as
        | [number, FrameRequestCallback]
        | undefined;
      if (!next) return false;
      const [id, callback] = next;
      callbacks.delete(id);
      callback(performance.now());
      return true;
    },
  };
}

function renderLink(href: string, onNavigate?: () => void) {
  return render(
    <TransitionLink href={href} onNavigate={onNavigate}>
      打开页面
    </TransitionLink>,
  );
}

beforeEach(() => {
  currentPathname = '/currents';
  currentLocale = 'zh';
  mockRouterPush.mockReset();
  window.history.replaceState({}, '', '/currents');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  });
});

afterEach(() => {
  resolvePendingViewTransition();
  cleanup();
  Reflect.deleteProperty(document, 'startViewTransition');
  Reflect.deleteProperty(window, 'requestAnimationFrame');
  Reflect.deleteProperty(window, 'cancelAnimationFrame');
  vi.restoreAllMocks();
});

describe('TransitionLink', () => {
  it('query-only 导航在查询参数 commit 后立即结算转场', async () => {
    const transition = installViewTransitionMock();
    const animationFrame = installAnimationFrameMock();
    renderLink('/currents?view=all');

    fireEvent.click(screen.getByRole('link', { name: '打开页面' }));

    expect(transition.startViewTransition).toHaveBeenCalledOnce();
    expect(mockRouterPush).toHaveBeenCalledWith('/currents?view=all');
    expect(transition.getUpdatePromise()).toBeDefined();

    let settled = false;
    transition.getUpdatePromise()?.then(() => {
      settled = true;
    });

    // URL 未提交时继续等待下一帧，不能提前截取旧页面。
    expect(animationFrame.runNextFrame()).toBe(true);
    await Promise.resolve();
    expect(settled).toBe(false);

    window.history.replaceState({}, '', '/currents?view=all');
    await act(async () => {
      expect(animationFrame.runNextFrame()).toBe(true);
      await Promise.resolve();
    });

    expect(settled).toBe(true);
    expect(transition.skipTransition).not.toHaveBeenCalled();
    expect(animationFrame.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('清除当前查询参数时仍执行 query-only 转场', async () => {
    window.history.replaceState({}, '', '/currents?view=all');
    const transition = installViewTransitionMock();
    const animationFrame = installAnimationFrameMock();
    renderLink('/currents');

    fireEvent.click(screen.getByRole('link', { name: '打开页面' }));

    expect(transition.startViewTransition).toHaveBeenCalledOnce();
    expect(mockRouterPush).toHaveBeenCalledWith('/currents');

    window.history.replaceState({}, '', '/currents');
    await act(async () => {
      expect(animationFrame.runNextFrame()).toBe(true);
      await Promise.resolve();
    });

    await expect(transition.getUpdatePromise()).resolves.toBeUndefined();
    expect(transition.skipTransition).not.toHaveBeenCalled();
  });

  it('重复点击当前完整 destination 时直接 push，不启动转场', () => {
    window.history.replaceState({}, '', '/currents?view=all');
    const transition = installViewTransitionMock();
    renderLink('/currents?view=all');

    fireEvent.click(screen.getByRole('link', { name: '打开页面' }));

    expect(mockRouterPush).toHaveBeenCalledOnce();
    expect(mockRouterPush).toHaveBeenCalledWith('/currents?view=all');
    expect(transition.startViewTransition).not.toHaveBeenCalled();
  });

  it('pathname 导航在新路径 commit 后结算转场', async () => {
    const transition = installViewTransitionMock();
    const view = renderLink('/blog');

    fireEvent.click(screen.getByRole('link', { name: '打开页面' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/blog');

    let settled = false;
    transition.getUpdatePromise()?.then(() => {
      settled = true;
    });

    currentPathname = '/blog';
    await act(async () => {
      view.rerender(<TransitionLink href="/blog">打开页面</TransitionLink>);
      await Promise.resolve();
    });

    expect(settled).toBe(true);
    expect(transition.skipTransition).not.toHaveBeenCalled();
  });

  it.each([
    ['Meta', { metaKey: true }],
    ['Control', { ctrlKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
  ])('%s 修饰点击保留浏览器默认导航，不启动转场', (_label, modifier) => {
    const transition = installViewTransitionMock();
    const onNavigate = vi.fn();
    render(
      <TransitionLink href="/blog" onNavigate={onNavigate} target="_blank">
        打开页面
      </TransitionLink>,
    );

    fireEvent.click(screen.getByRole('link', { name: '打开页面' }), modifier);

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(transition.startViewTransition).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
