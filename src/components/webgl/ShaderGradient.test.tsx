// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShaderGradient from './ShaderGradient';

const mocks = vi.hoisted(() => ({
  gate: vi.fn(), stopGate: vi.fn(), draw: vi.fn(), loseContext: vi.fn(),
  removeGeometry: vi.fn(), removeProgram: vi.fn(), construct: vi.fn(),
}));
vi.mock('@/lib/webgl', () => ({ observeRenderGate: mocks.gate }));
vi.mock('ogl', () => ({
  Renderer: class {
    gl = {
      canvas: document.createElement('canvas'), clearColor: vi.fn(), enable: vi.fn(),
      blendFunc: vi.fn(), getExtension: () => ({ loseContext: mocks.loseContext }),
    };
    constructor() { mocks.construct(); }
    setSize = vi.fn();
    render = mocks.draw;
  },
  Triangle: class { remove = mocks.removeGeometry; },
  Program: class {
    uniforms: Record<string, { value: unknown }>;
    constructor(_gl: unknown, options: { uniforms: Record<string, { value: unknown }> }) {
      this.uniforms = options.uniforms;
    }
    remove = mocks.removeProgram;
  },
  Mesh: class {},
}));

let gateChange: (active: boolean) => void;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  let nextId = 1;
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, cb);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  mocks.gate.mockImplementation((_el, onChange) => {
    gateChange = onChange;
    return mocks.stopGate;
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function frame(time = 100) {
  const [id, callback] = [...frames.entries()][0];
  frames.delete(id);
  act(() => callback(time));
}

describe('ShaderGradient lifecycle', () => {
  it('waits for visibility, pauses offscreen, resumes and releases GPU resources on unmount', () => {
    const ready = vi.fn();
    const { container, unmount } = render(<ShaderGradient onReadyChange={ready} />);
    expect(frames.size).toBe(0);
    act(() => gateChange(true));
    frame();
    expect(mocks.draw).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledWith(true);
    act(() => gateChange(false));
    expect(frames.size).toBe(0);
    act(() => gateChange(true));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(mocks.stopGate).toHaveBeenCalledOnce();
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(mocks.loseContext).toHaveBeenCalledOnce();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('falls back without throwing when context creation fails', () => {
    mocks.construct.mockImplementationOnce(() => { throw new Error('context limit'); });
    const ready = vi.fn();
    const { container } = render(<ShaderGradient onReadyChange={ready} />);
    expect(ready).toHaveBeenCalledWith(false);
    expect(container.querySelector('canvas')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it('stops and reveals fallback after a draw failure', () => {
    mocks.draw.mockImplementationOnce(() => { throw new Error('lost renderer'); });
    const ready = vi.fn();
    render(<ShaderGradient onReadyChange={ready} />);
    act(() => gateChange(true));
    frame();
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(frames.size).toBe(0);
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
  });

  it('handles context loss once and does not restart a disposed renderer', () => {
    const ready = vi.fn();
    const { container, unmount } = render(<ShaderGradient onReadyChange={ready} />);
    act(() => gateChange(true));
    frame();
    act(() => container.querySelector('canvas')!.dispatchEvent(new Event('webglcontextlost')));
    expect(ready).toHaveBeenLastCalledWith(false);
    act(() => gateChange(true));
    expect(frames.size).toBe(0);
    unmount();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
  });
});
