// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Particles from "./Particles";

const mock = vi.hoisted(() => ({ construct: vi.fn(), render: vi.fn(), gate: vi.fn(), stopGate: vi.fn(), lose: vi.fn(), geometryRemove: vi.fn(), programRemove: vi.fn(), uniforms: [] as Array<Record<string, { value: unknown }>>, geometry: [] as Array<{ attributes: Record<string, { data: Float32Array; needsUpdate?: boolean }> }> }));
vi.mock("@/lib/webgl", () => ({ observeRenderGate: mock.gate }));
vi.mock("ogl", () => ({
  Renderer: class {
    gl = { canvas: document.createElement("canvas"), clearColor: vi.fn(), getProgramParameter: () => true, getExtension: () => ({ loseContext: mock.lose }) };
    constructor() { mock.construct(); }
    setSize = vi.fn(); render = mock.render;
  },
  Camera: class { position = { set: vi.fn(), z: 20 }; perspective = vi.fn(); },
  Geometry: class {
    attributes: Record<string, { data: Float32Array; needsUpdate?: boolean }>;
    constructor(_gl: unknown, attributes: Record<string, { data: Float32Array }>) { this.attributes = attributes; mock.geometry.push(this); }
    remove = mock.geometryRemove;
  },
  Program: class {
    program = {};
    uniforms: Record<string, { value: unknown }>;
    constructor(_gl: unknown, options: { uniforms: Record<string, { value: unknown }> }) { this.uniforms = options.uniforms; mock.uniforms.push(this.uniforms); }
    remove = mock.programRemove;
  },
  Mesh: class { geometry: unknown; position = { x: 0, y: 0 }; rotation = { x: 0, y: 0, z: 0 }; constructor(_gl: unknown, options: { geometry: unknown }) { this.geometry = options.geometry; } },
}));
let gateChange: (active: boolean) => void;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.clearAllMocks(); mock.uniforms.length = 0; mock.geometry.length = 0; frames = new Map(); let next = 1;
  mock.gate.mockImplementation((_element, cb) => { gateChange = cb; return mock.stopGate; });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { const id = next++; frames.set(id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = vi.fn(); });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function frame(time: number) { const [id, cb] = [...frames.entries()][0]; frames.delete(id); act(() => cb(time)); }

describe("Particles renderer lifecycle", () => {
  it("does not create another context for continuous controls or color changes", () => {
    const { rerender, unmount } = render(<Particles particleCount={20} speed={0.1} particleColors={["#ffffff"]} />);
    expect(frames.size).toBe(0); act(() => gateChange(true)); frame(100);
    rerender(<Particles particleCount={20} speed={0.3} particleSpread={14} particleHoverFactor={2} particleColors={["#000000"]} />);
    frame(116);
    expect(mock.construct).toHaveBeenCalledOnce(); expect(mock.geometry).toHaveLength(1);
    expect(mock.uniforms[0].uSpread.value).toBe(14);
    expect([...mock.geometry[0].attributes.color.data].every((value) => value === 0)).toBe(true);
    expect(mock.geometry[0].attributes.color.needsUpdate).toBe(true);
    unmount(); expect(mock.lose).toHaveBeenCalledOnce(); expect(mock.geometryRemove).toHaveBeenCalledOnce(); expect(mock.programRemove).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
  });
  it("updates count buffers without another context and pauses offscreen", () => {
    const { rerender } = render(<Particles particleCount={10} />);
    act(() => gateChange(true)); frame(100); rerender(<Particles particleCount={30} />); frame(116);
    expect(mock.construct).toHaveBeenCalledOnce(); expect(mock.geometry).toHaveLength(2); expect(mock.geometryRemove).toHaveBeenCalledOnce();
    act(() => gateChange(false)); expect(frames.size).toBe(0); act(() => gateChange(true)); expect(frames.size).toBe(1);
  });
  it("reveals failure and releases resources on context loss", () => {
    const ready = vi.fn(); const { container, unmount } = render(<Particles onReadyChange={ready} />);
    act(() => gateChange(true)); frame(100); expect(ready).toHaveBeenLastCalledWith(true);
    act(() => container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost")));
    expect(ready).toHaveBeenLastCalledWith(false); expect(frames.size).toBe(0); expect(container.querySelector("canvas")).toBeNull();
    act(() => gateChange(true)); expect(frames.size).toBe(0); unmount(); expect(mock.lose).toHaveBeenCalledOnce();
  });
  it("contains initialization failures", () => {
    mock.construct.mockImplementationOnce(() => { throw new Error("context limit"); });
    const ready = vi.fn(); render(<Particles onReadyChange={ready} />);
    expect(ready).toHaveBeenCalledWith(false); expect(frames.size).toBe(0);
  });
  it("captures a touch drag and releases it on cancellation, leaving decoration scrollable", () => {
    const { container, unmount } = render(<Particles moveParticlesOnHover interactionLabel="Particles" />);
    const host = container.firstElementChild as HTMLDivElement;
    const captured = new Set<number>();
    host.setPointerCapture = vi.fn(id => captured.add(id));
    host.hasPointerCapture = id => captured.has(id);
    host.releasePointerCapture = vi.fn(id => captured.delete(id));
    const pointer = (type: string, id = 1) => act(() => host.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { pointerId: id, button: 0, clientX: 20, clientY: 20 })));
    expect(host.style.touchAction).toBe("none");
    pointer("pointerdown"); expect(host.setPointerCapture).toHaveBeenCalledWith(1);
    pointer("pointerdown", 2); expect(host.setPointerCapture).toHaveBeenCalledTimes(1);
    pointer("pointerleave"); expect(captured.has(1)).toBe(true);
    pointer("pointercancel"); expect(captured.size).toBe(0);
    pointer("pointerdown"); act(() => gateChange(false)); expect(captured.size).toBe(0);
    pointer("pointerdown"); unmount(); expect(captured.size).toBe(0);
    const decorative = render(<Particles moveParticlesOnHover />);
    expect((decorative.container.firstElementChild as HTMLElement).style.touchAction).not.toBe("none");
    decorative.unmount();
  });
});
