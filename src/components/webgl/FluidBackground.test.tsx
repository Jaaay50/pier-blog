// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FluidBackground } from './FluidBackground';

const mocks = vi.hoisted(() => ({ quality: vi.fn(), theme: vi.fn(), shader: vi.fn() }));
vi.mock('@/lib/webgl', () => ({ useWebGLQuality: mocks.quality }));
vi.mock('next-themes', () => ({ useTheme: mocks.theme }));
vi.mock('next/dynamic', () => ({ default: () => (props: unknown) => {
  mocks.shader(props);
  return <canvas data-shader />;
} }));
afterEach(cleanup);

describe('FluidBackground fallback', () => {
  it('includes both CSS-selected theme gradients in server HTML before capabilities resolve', () => {
    mocks.quality.mockReturnValue(null);
    mocks.theme.mockReturnValue({ resolvedTheme: undefined });
    const html = renderToString(<FluidBackground />);
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('linear-gradient');
    expect(html).not.toContain('<canvas');
  });

  it.each(['reduced motion', 'no WebGL', 'low device tier'])('retains static gradients for %s', () => {
    mocks.quality.mockReturnValue({ enabled: false });
    mocks.theme.mockReturnValue({ resolvedTheme: 'dark' });
    const { container } = render(<FluidBackground />);
    expect(container.querySelectorAll('[data-theme]')).toHaveLength(2);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('[hidden]')).toBeNull();
  });

  it('keeps the fallback visible while an enabled shader loads', () => {
    mocks.quality.mockReturnValue({ enabled: true, dpr: 1 });
    mocks.theme.mockReturnValue({ resolvedTheme: 'light' });
    const { container } = render(<FluidBackground />);
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(container.querySelector('[hidden]')).toBeNull();
  });

  it('hides the fallback only after a successful frame and restores it on shader failure', () => {
    mocks.quality.mockReturnValue({ enabled: true, dpr: 1 });
    mocks.theme.mockReturnValue({ resolvedTheme: 'light' });
    const { container } = render(<FluidBackground />);
    const props = mocks.shader.mock.lastCall![0];
    act(() => props.onReadyChange(true));
    expect(container.querySelector('[hidden]')).not.toBeNull();
    act(() => props.onReadyChange(false));
    expect(container.querySelector('[hidden]')).toBeNull();
  });
});
