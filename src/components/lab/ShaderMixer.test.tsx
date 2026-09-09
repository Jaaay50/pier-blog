// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShaderMixer from "./ShaderMixer";
import type { WebGLQuality } from "@/lib/webgl";
const mocks = vi.hoisted(() => ({ gate: vi.fn(), stopGate: vi.fn() }));
vi.mock("@/lib/webgl", () => ({ observeRenderGate: mocks.gate }));
let change: (active: boolean) => void, frames: Map<number, FrameRequestCallback>;
let gl: Record<string, unknown>;
const quality: WebGLQuality = { webglSupported: true, enabled: true, reducedMotion: false, dpr: 1, particleMultiplier: 1, mouseInteraction: true, tier: "high" };
const labels = { hue: "Hue", flow: "Flow", turbulence: "Turbulence", zoom: "Zoom", randomize: "Randomize" };
beforeEach(() => {
  vi.clearAllMocks(); frames = new Map(); let next = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { const id = next++; frames.set(id, callback); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = vi.fn(); });
  class FakeGL {}
  vi.stubGlobal("WebGLRenderingContext", FakeGL);
  gl = Object.assign(new FakeGL(), Object.fromEntries(["shaderSource", "compileShader", "deleteShader", "attachShader", "linkProgram", "useProgram", "bindBuffer", "bufferData", "enableVertexAttribArray", "vertexAttribPointer", "viewport", "uniform2f", "uniform1f", "uniform4f", "drawArrays", "deleteProgram", "deleteBuffer"].map((name) => [name, vi.fn()])), {
    createShader: vi.fn(() => ({})), createProgram: vi.fn(() => ({})), createBuffer: vi.fn(() => ({})), getShaderParameter: vi.fn(() => true), getProgramParameter: vi.fn(() => true), getAttribLocation: vi.fn(() => 0), getUniformLocation: vi.fn((_program, name) => name), getError: vi.fn(() => 0), NO_ERROR: 0, getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => gl as unknown as WebGLRenderingContext);
  mocks.gate.mockImplementation((_element, cb) => { change = cb; return mocks.stopGate; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(time: number) { const [id, cb] = [...frames.entries()][0]; frames.delete(id); act(() => cb(time)); }

describe("Shader mixer lifecycle", () => {
  it("waits for visibility and changes uniforms without compiling another program", () => {
    const ready = vi.fn(); const { unmount } = render(<ShaderMixer quality={quality} labels={labels} onReadyChange={ready} />);
    expect(frames.size).toBe(0); act(() => change(true)); frame(100); expect(ready).toHaveBeenCalledWith(true);
    fireEvent.change(screen.getByRole("slider", { name: /Hue/ }), { target: { value: "0.8" } }); frame(116);
    expect(gl.createProgram).toHaveBeenCalledOnce(); expect(gl.uniform1f).toHaveBeenCalledWith("uHue", 0.8);
    act(() => change(false)); expect(frames.size).toBe(0); act(() => change(true)); expect(frames.size).toBe(1);
    unmount(); expect(frames.size).toBe(0); expect(gl.deleteShader).toHaveBeenCalledTimes(2); expect(gl.deleteProgram).toHaveBeenCalledOnce(); expect(gl.deleteBuffer).toHaveBeenCalledOnce();
  });
  it("releases resources and signals fallback after context loss", () => {
    const ready = vi.fn(); const { container } = render(<ShaderMixer quality={quality} labels={labels} onReadyChange={ready} />);
    act(() => change(true)); frame(100);
    act(() => container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost")));
    expect(ready).toHaveBeenLastCalledWith(false); expect(frames.size).toBe(0); expect(container.querySelector("canvas")).toBeNull();
    act(() => change(true)); expect(frames.size).toBe(0);
  });
  it("does not report a linked or first-frame failure as ready", () => {
    (gl.getProgramParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const ready = vi.fn(); render(<ShaderMixer quality={quality} labels={labels} onReadyChange={ready} />);
    expect(ready).toHaveBeenCalledWith(false); expect(ready).not.toHaveBeenCalledWith(true); expect(gl.deleteProgram).toHaveBeenCalledOnce();
  });
});
