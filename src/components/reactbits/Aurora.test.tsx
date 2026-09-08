// @vitest-environment jsdom

import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Aurora from './Aurora';

type Vec3 = [number, number, number];
interface AuroraUniforms {
  uTime: { value: number };
  uAmplitude: { value: number };
  uColorStops: { value: Vec3[] };
  uResolution: { value: [number, number] };
  uBlend: { value: number };
  uLightMode: { value: number };
  uBackgroundColor: { value: Vec3 };
}
interface ProgramOptions {
  vertex: string;
  fragment: string;
  uniforms: AuroraUniforms;
}
interface ShaderHandle { stage: 'vertex' | 'fragment' }

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  constructGeometry: vi.fn(),
  constructProgram: vi.fn(),
  draw: vi.fn(),
  setSize: vi.fn<(width: number, height: number) => void>(),
  gate: vi.fn<(element: Element, onChange: (active: boolean) => void) => () => void>(),
  stopGate: vi.fn(),
  removeGeometry: vi.fn(),
  removeProgram: vi.fn(),
  deleteShader: vi.fn<(shader: ShaderHandle) => void>(),
  deleteBuffer: vi.fn(),
  loseContext: vi.fn(),
  getShaderParameter: vi.fn<(shader: ShaderHandle, parameter: number) => boolean>(),
  getProgramParameter: vi.fn<(program: object, parameter: number) => boolean>(),
  isContextLost: vi.fn<() => boolean>(),
  getError: vi.fn<() => number>(),
  parseColor: vi.fn<(value: string) => void>(),
  canvases: [] as HTMLCanvasElement[],
  programs: [] as ProgramOptions[],
  gates: [] as ((active: boolean) => void)[],
}));

vi.mock('@/lib/webgl', () => ({ observeRenderGate: mocks.gate }));
vi.mock('ogl', async () => {
  const actual = await vi.importActual<typeof import('ogl')>('ogl');
  return {
    Renderer: class {
      gl = {
        canvas: document.createElement('canvas'),
        BLEND: 0x0be2,
        ONE: 1,
        ONE_MINUS_SRC_ALPHA: 0x0303,
        COMPILE_STATUS: 0x8b81,
        LINK_STATUS: 0x8b82,
        NO_ERROR: 0,
        clearColor: vi.fn(),
        enable: vi.fn(),
        blendFunc: vi.fn(),
        getExtension: () => ({ loseContext: mocks.loseContext }),
        getShaderParameter: mocks.getShaderParameter,
        getProgramParameter: mocks.getProgramParameter,
        isContextLost: mocks.isContextLost,
        getError: mocks.getError,
        deleteShader: mocks.deleteShader,
        deleteBuffer: mocks.deleteBuffer,
      };
      constructor() {
        mocks.construct();
        mocks.canvases.push(this.gl.canvas);
      }
      setSize = mocks.setSize;
      render = mocks.draw;
    },
    Triangle: class {
      attributes = { uv: { buffer: {} } };
      constructor() { mocks.constructGeometry(); }
      remove = mocks.removeGeometry;
    },
    Program: class {
      uniforms: AuroraUniforms;
      vertexShader: ShaderHandle = { stage: 'vertex' };
      fragmentShader: ShaderHandle = { stage: 'fragment' };
      program = {};
      constructor(_gl: unknown, options: ProgramOptions) {
        mocks.constructProgram();
        this.uniforms = options.uniforms;
        mocks.programs.push(options);
      }
      remove = mocks.removeProgram;
    },
    Mesh: class {},
    Color: class extends actual.Color {
      constructor(value: string) {
        mocks.parseColor(value);
        super(value);
      }
    },
  };
});

let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.canvases.length = 0;
  mocks.programs.length = 0;
  mocks.gates.length = 0;
  mocks.getShaderParameter.mockReturnValue(true);
  mocks.getProgramParameter.mockReturnValue(true);
  mocks.isContextLost.mockReturnValue(false);
  mocks.getError.mockReturnValue(0);
  mocks.gate.mockImplementation((_element, onChange) => {
    mocks.gates.push(onChange);
    return mocks.stopGate;
  });
  frames = new Map();
  let nextId = 1;
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setVisible(active: boolean, index = mocks.gates.length - 1) {
  const gate = mocks.gates[index];
  if (!gate) throw new Error('No render gate was installed');
  act(() => gate(active));
}
function frame(time: number) {
  const entry = frames.entries().next().value;
  if (!entry) throw new Error('No animation frame was scheduled');
  const [id, callback] = entry;
  frames.delete(id);
  act(() => callback(time));
}
function uniforms(index = mocks.programs.length - 1) {
  const program = mocks.programs[index];
  if (!program) throw new Error('No shader program was initialized');
  return program.uniforms;
}

const WARM_STOPS = ['#d97757', '#e8c4a0', '#c6613f'];
const WARM_BACKGROUND: Vec3 = [250 / 255, 249 / 255, 245 / 255];

describe('Aurora shader parameters', () => {
  it('keeps the legacy branch and default colors when lightMode is omitted', () => {
    const { container } = render(<Aurora />);
    expect(uniforms().uLightMode.value).toBe(0);
    expect(uniforms().uBackgroundColor.value).toEqual([1, 1, 1]);
    expect(uniforms().uAmplitude.value).toBe(1);
    expect(uniforms().uBlend.value).toBe(0.5);
    expect(uniforms().uColorStops.value).toEqual([
      [82 / 255, 39 / 255, 1], [124 / 255, 1, 103 / 255], [82 / 255, 39 / 255, 1],
    ]);
    expect(mocks.programs[0].fragment).toContain('fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);');
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(frames.size).toBe(0);
  });

  it('uses the upstream light composition with the caller\'s paper background', () => {
    render(<Aurora lightMode backgroundColor="#faf9f5" colorStops={WARM_STOPS} amplitude={1.2} blend={0.5} />);
    expect(uniforms().uLightMode.value).toBe(1);
    expect(uniforms().uBackgroundColor.value).toEqual(WARM_BACKGROUND);
    expect(uniforms().uAmplitude.value).toBe(1.2);
    expect(uniforms().uColorStops.value[0]).toEqual([217 / 255, 119 / 255, 87 / 255]);
    expect(mocks.programs[0].fragment).toContain('mix(uBackgroundColor, chroma, min(coverage * 1.08, 0.94))');
  });

  it('defaults to white in light mode and ignores backgroundColor in legacy mode', () => {
    const { rerender } = render(<Aurora backgroundColor="#invalid" />);
    setVisible(true);
    frame(0);
    expect(mocks.parseColor).not.toHaveBeenCalledWith('#invalid');
    rerender(<Aurora lightMode />);
    frame(100);
    expect(uniforms().uLightMode.value).toBe(1);
    expect(uniforms().uBackgroundColor.value).toEqual([1, 1, 1]);
    expect(mocks.construct).toHaveBeenCalledOnce();
  });

  it('updates live controls and explicit time without rebuilding the renderer', () => {
    const { rerender } = render(<Aurora />);
    setVisible(true);
    frame(1000);
    rerender(<Aurora lightMode backgroundColor="#faf9f5" colorStops={WARM_STOPS} amplitude={1.2} blend={0.4} speed={2} time={7} />);
    frame(1100);
    expect(uniforms().uLightMode.value).toBe(1);
    expect(uniforms().uBackgroundColor.value).toEqual(WARM_BACKGROUND);
    expect(uniforms().uAmplitude.value).toBe(1.2);
    expect(uniforms().uBlend.value).toBe(0.4);
    expect(uniforms().uTime.value).toBeCloseTo(1.4);
    expect(uniforms().uColorStops.value[0]).toEqual([217 / 255, 119 / 255, 87 / 255]);
    rerender(<Aurora />);
    frame(1200);
    expect(uniforms().uLightMode.value).toBe(0);
    expect(uniforms().uAmplitude.value).toBe(1);
    expect(uniforms().uBlend.value).toBe(0.5);
    expect(uniforms().uTime.value).toBeCloseTo(0.2);
    expect(mocks.construct).toHaveBeenCalledOnce();
    expect(mocks.constructProgram).toHaveBeenCalledOnce();
  });

  it('reuses parsed colors across frames and equal new arrays, including callback changes', () => {
    const firstReady = vi.fn<(ready: boolean) => void>();
    const nextReady = vi.fn<(ready: boolean) => void>();
    const { rerender } = render(<Aurora lightMode backgroundColor="#faf9f5" colorStops={[...WARM_STOPS]} onReadyChange={firstReady} />);
    setVisible(true);
    frame(1000);
    const stops = uniforms().uColorStops.value;
    const background = uniforms().uBackgroundColor.value;
    expect(mocks.parseColor).toHaveBeenCalledTimes(4);
    rerender(<Aurora lightMode backgroundColor="#faf9f5" colorStops={[...WARM_STOPS]} onReadyChange={nextReady} />);
    expect(nextReady).toHaveBeenLastCalledWith(true);
    frame(1100);
    frame(1200);
    expect(uniforms().uColorStops.value).toBe(stops);
    expect(uniforms().uBackgroundColor.value).toBe(background);
    expect(mocks.parseColor).toHaveBeenCalledTimes(4);
    expect(mocks.construct).toHaveBeenCalledOnce();
    const changedStops = [...WARM_STOPS];
    changedStops[0] = '#123456';
    rerender(<Aurora lightMode backgroundColor="#faf9f5" colorStops={changedStops} onReadyChange={nextReady} />);
    frame(1300);
    expect(uniforms().uColorStops.value[0]).toEqual([18 / 255, 52 / 255, 86 / 255]);
    expect(mocks.parseColor).toHaveBeenCalledTimes(7);
    act(() => mocks.canvases[0].dispatchEvent(new Event('webglcontextlost')));
    expect(nextReady).toHaveBeenLastCalledWith(false);
    expect(firstReady).toHaveBeenLastCalledWith(true);
  });

  it('detects in-place color changes rather than retaining stale cached values', () => {
    const stops = [...WARM_STOPS];
    render(<Aurora colorStops={stops} />);
    setVisible(true);
    frame(0);
    stops[1] = '#ffffff';
    frame(100);
    expect(uniforms().uColorStops.value[1]).toEqual([1, 1, 1]);
  });

  it('checks GL errors only on first frame, reconfiguration, resize and resume', () => {
    const { rerender } = render(<Aurora />);
    setVisible(true);
    frame(1000);
    frame(1100);
    frame(1200);
    expect(mocks.getError).toHaveBeenCalledOnce();
    rerender(<Aurora lightMode backgroundColor="#faf9f5" />);
    frame(1300);
    expect(mocks.getError).toHaveBeenCalledTimes(2);
    frame(1400);
    expect(mocks.getError).toHaveBeenCalledTimes(2);
    act(() => window.dispatchEvent(new Event('resize')));
    frame(1500);
    expect(mocks.getError).toHaveBeenCalledTimes(3);
    setVisible(false);
    setVisible(true);
    frame(101500);
    expect(mocks.getError).toHaveBeenCalledTimes(4);
    expect(mocks.isContextLost).toHaveBeenCalledTimes(7);
  });

  it('clamps zero-sized containers and updates resolution on resize', () => {
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(0);
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(0);
    render(<Aurora />);
    expect(mocks.setSize).toHaveBeenLastCalledWith(1, 1);
    width.mockReturnValue(1440);
    height.mockReturnValue(900);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(mocks.setSize).toHaveBeenLastCalledWith(1440, 900);
    expect(uniforms().uResolution.value).toEqual([1440, 900]);
  });
});

describe('Aurora readiness and lifecycle', () => {
  it('reports ready only after the first successful visible frame', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora onReadyChange={ready} />);
    expect(ready.mock.calls).toEqual([[false]]);
    expect(mocks.draw).not.toHaveBeenCalled();
    setVisible(false);
    expect(frames.size).toBe(0);
    setVisible(true);
    expect(ready.mock.calls).toEqual([[false]]);
    frame(1000);
    expect(ready.mock.calls).toEqual([[false], [true]]);
    frame(1100);
    expect(ready.mock.calls).toEqual([[false], [true]]);
  });

  it('pauses without clearing readiness and resumes with no elapsed-time jump', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    frame(1200);
    expect(uniforms().uTime.value).toBeCloseTo(0.2);
    setVisible(false);
    expect(frames.size).toBe(0);
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(container.querySelector('canvas')).not.toBeNull();
    setVisible(true);
    setVisible(true);
    expect(frames.size).toBe(1);
    frame(101200);
    expect(uniforms().uTime.value).toBeCloseTo(0.2);
    frame(101300);
    expect(uniforms().uTime.value).toBeCloseTo(0.3);
  });

  it('does not schedule again if the gate closes during a draw', () => {
    render(<Aurora />);
    setVisible(true);
    mocks.draw.mockImplementationOnce(() => mocks.gates[0](false));
    frame(1000);
    expect(frames.size).toBe(0);
    setVisible(true);
    frame(101000);
    expect(uniforms().uTime.value).toBe(0);
  });

  it('releases shaders, geometry, context, frames and listeners exactly once', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render(<Aurora onReadyChange={ready} />);
    const canvas = mocks.canvases[0];
    const removeCanvasListener = vi.spyOn(canvas, 'removeEventListener');
    setVisible(true);
    frame(1000);
    const pending = frames.values().next().value;
    const sizeCallsBeforeUnmount = mocks.setSize.mock.calls.length;
    unmount();
    expect(frames.size).toBe(0);
    expect(container.querySelector('canvas')).toBeNull();
    expect(mocks.stopGate).toHaveBeenCalledOnce();
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(mocks.deleteShader).toHaveBeenCalledTimes(2);
    expect(mocks.deleteBuffer).toHaveBeenCalledOnce();
    expect(mocks.loseContext).toHaveBeenCalledOnce();
    expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeCanvasListener).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
    expect(ready).toHaveBeenLastCalledWith(false);
    act(() => pending?.(1100));
    setVisible(true);
    act(() => canvas.dispatchEvent(new Event('webglcontextlost')));
    act(() => window.dispatchEvent(new Event('resize')));
    expect(frames.size).toBe(0);
    expect(mocks.draw).toHaveBeenCalledOnce();
    expect(mocks.setSize).toHaveBeenCalledTimes(sizeCallsBeforeUnmount);
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
  });

  it('survives StrictMode setup/cleanup replay without reviving the old renderer', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const { container, unmount } = render(<StrictMode><Aurora onReadyChange={ready} /></StrictMode>);
    expect(mocks.construct).toHaveBeenCalledTimes(2);
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    setVisible(true, 0);
    expect(frames.size).toBe(0);
    setVisible(true, 1);
    frame(1000);
    expect(ready).toHaveBeenLastCalledWith(true);
    unmount();
    expect(frames.size).toBe(0);
    expect(mocks.removeProgram).toHaveBeenCalledTimes(2);
    expect(mocks.deleteShader).toHaveBeenCalledTimes(4);
    expect(mocks.stopGate).toHaveBeenCalledTimes(2);
  });
});

describe('Aurora real visibility gate integration', () => {
  it('pauses for offscreen and hidden-document states, then resumes without counting wall-clock time', async () => {
    const { observeRenderGate } = await vi.importActual<typeof import('@/lib/webgl')>('@/lib/webgl');
    let notifyIntersection: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notifyIntersection = callback; }
      observe() {}
      disconnect = disconnect;
    });
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    mocks.gate.mockImplementation(observeRenderGate);
    const ready = vi.fn<(ready: boolean) => void>();
    const { unmount } = render(<Aurora onReadyChange={ready} />);
    const intersect = (isIntersecting: boolean) => act(() => {
      notifyIntersection?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    intersect(false);
    expect(frames.size).toBe(0);
    intersect(true);
    frame(1000);
    frame(1200);
    expect(uniforms().uTime.value).toBeCloseTo(0.2);
    hidden = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(frames.size).toBe(0);
    intersect(false);
    hidden = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(frames.size).toBe(0);
    intersect(true);
    frame(101200);
    expect(uniforms().uTime.value).toBeCloseTo(0.2);
    frame(101300);
    expect(uniforms().uTime.value).toBeCloseTo(0.3);
    expect(ready.mock.calls).toEqual([[false], [true]]);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(frames.size).toBe(0);
  });
});

describe('Aurora visible dimensions', () => {
  it('remeasures a CSS-hidden mount when it becomes visible without a window resize', () => {
    let width = 0;
    let height = 0;
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora lightMode onReadyChange={ready} />);
    expect(uniforms().uResolution.value).toEqual([1, 1]);
    width = 1440;
    height = 900;
    setVisible(true);
    frame(1000);
    expect(mocks.setSize).toHaveBeenLastCalledWith(1440, 900);
    expect(uniforms().uResolution.value).toEqual([1440, 900]);
    expect(ready).toHaveBeenLastCalledWith(true);
    setVisible(false);
    width = 390;
    height = 844;
    setVisible(true);
    frame(5000);
    expect(uniforms().uResolution.value).toEqual([390, 844]);
    expect(uniforms().uTime.value).toBe(0);
  });

  it('does not restart a renderer if measuring on resume fails', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    setVisible(false);
    mocks.setSize.mockImplementationOnce(() => { throw new Error('resume resize failure'); });
    setVisible(true);
    expect(frames.size).toBe(0);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
  });
});

describe('Aurora failure fallback', () => {
  it.each(['renderer', 'geometry', 'program'] as const)('cleans up a %s creation failure without throwing', (stage) => {
    const constructors = {
      renderer: mocks.construct,
      geometry: mocks.constructGeometry,
      program: mocks.constructProgram,
    };
    constructors[stage].mockImplementationOnce(() => { throw new Error('creation failure'); });
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(container.querySelector('canvas')).toBeNull();
    expect(frames.size).toBe(0);
    expect(mocks.gate).not.toHaveBeenCalled();
    if (stage !== 'renderer') expect(mocks.loseContext).toHaveBeenCalledOnce();
  });

  it.each(['vertex', 'fragment', 'link'] as const)('rejects a non-throwing %s shader failure', (stage) => {
    if (stage === 'link') mocks.getProgramParameter.mockReturnValue(false);
    else mocks.getShaderParameter.mockImplementation(shader => shader.stage !== stage);
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(ready).not.toHaveBeenCalledWith(true);
    expect(container.querySelector('canvas')).toBeNull();
    expect(mocks.draw).not.toHaveBeenCalled();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(mocks.deleteShader).toHaveBeenCalledTimes(2);
  });

  it('rejects a non-throwing GL error before reporting first-frame readiness', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    mocks.getError.mockReturnValueOnce(0x0502);
    frame(1000);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(ready).not.toHaveBeenCalledWith(true);
    expect(frames.size).toBe(0);
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
  });

  it('handles a throwing draw without reporting a successful first frame', () => {
    mocks.draw.mockImplementationOnce(() => { throw new Error('draw failure'); });
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    expect(ready).not.toHaveBeenCalledWith(true);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(frames.size).toBe(0);
    expect(container.querySelector('canvas')).toBeNull();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    setVisible(true);
    expect(frames.size).toBe(0);
  });

  it('falls back when a later frame throws without a prop change', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    mocks.draw.mockImplementationOnce(() => { throw new Error('later draw failure'); });
    frame(1100);
    expect(ready.mock.calls).toEqual([[false], [true], [false]]);
    expect(frames.size).toBe(0);
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
  });

  it('falls back if WebGL reports a non-throwing draw error after reconfiguration', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const { rerender } = render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    rerender(<Aurora lightMode onReadyChange={ready} />);
    mocks.getError.mockReturnValueOnce(0x0502);
    frame(1100);
    expect(ready.mock.calls).toEqual([[false], [true], [false]]);
    expect(frames.size).toBe(0);
    expect(mocks.removeGeometry).toHaveBeenCalledOnce();
  });

  it('handles context loss without an event and cannot revive a disposed loop', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    mocks.isContextLost.mockReturnValue(true);
    frame(1000);
    expect(ready).not.toHaveBeenCalledWith(true);
    expect(frames.size).toBe(0);
    setVisible(true);
    expect(frames.size).toBe(0);
  });

  it('handles context loss during a draw without overwriting fallback readiness', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const { container, unmount } = render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    mocks.draw.mockImplementationOnce(() => mocks.canvases[0].dispatchEvent(new Event('webglcontextlost')));
    frame(1100);
    expect(ready.mock.calls).toEqual([[false], [true], [false]]);
    expect(frames.size).toBe(0);
    expect(container.querySelector('canvas')).toBeNull();
    setVisible(true);
    unmount();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(mocks.loseContext).toHaveBeenCalledOnce();
  });

  it('finishes cleanup when releasing an already-lost GPU resource throws', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const { container, unmount } = render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    mocks.removeGeometry.mockImplementationOnce(() => { throw new Error('lost geometry'); });
    mocks.deleteShader.mockImplementationOnce(() => { throw new Error('lost shader'); });
    mocks.loseContext.mockImplementationOnce(() => { throw new Error('lost context'); });
    expect(() => unmount()).not.toThrow();
    expect(container.querySelector('canvas')).toBeNull();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(mocks.deleteShader).toHaveBeenCalledTimes(2);
    expect(ready).toHaveBeenLastCalledWith(false);
  });

  it('releases initialization resources if the first resize fails', () => {
    mocks.setSize.mockImplementationOnce(() => { throw new Error('initial resize failure'); });
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(container.querySelector('canvas')).toBeNull();
    expect(mocks.gate).not.toHaveBeenCalled();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it('cleans up when installing the visibility gate fails', () => {
    mocks.gate.mockImplementationOnce(() => { throw new Error('observer failure'); });
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(container.querySelector('canvas')).toBeNull();
    expect(mocks.removeProgram).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it('falls back after a resize failure and removes its listeners', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    const { container } = render(<Aurora onReadyChange={ready} />);
    setVisible(true);
    frame(1000);
    mocks.setSize.mockImplementationOnce(() => { throw new Error('resize failure'); });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(container.querySelector('canvas')).toBeNull();
    expect(frames.size).toBe(0);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(mocks.setSize).toHaveBeenCalledTimes(3);
  });

  it('rejects an invalid color-stop count before starting a renderer loop', () => {
    const ready = vi.fn<(ready: boolean) => void>();
    render(<Aurora colorStops={['#ffffff']} onReadyChange={ready} />);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(mocks.constructProgram).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(mocks.loseContext).toHaveBeenCalledOnce();
  });
});
