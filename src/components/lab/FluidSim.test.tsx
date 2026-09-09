// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FluidSim from "./FluidSim";
import type { WebGLQuality } from "@/lib/webgl";
const mocks = vi.hoisted(() => ({ gate: vi.fn(), stopGate: vi.fn() }));
vi.mock("@/lib/webgl", () => ({ observeRenderGate: mocks.gate }));
vi.mock("next-intl", () => ({ useLocale: () => "zh" }));
const quality: WebGLQuality = { webglSupported: true, enabled: true, reducedMotion: false, tier: "high", dpr: 1, particleMultiplier: 1, mouseInteraction: true };
let gl: Record<string, unknown>, frames: Map<number, FrameRequestCallback>, gate: (active: boolean) => void;
beforeEach(() => {
  vi.clearAllMocks(); frames = new Map(); let next = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { const id = next++; frames.set(id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe = vi.fn(); disconnect = vi.fn(); });
  gl = Object.assign(Object.fromEntries(["shaderSource", "compileShader", "deleteShader", "attachShader", "linkProgram", "useProgram", "bindTexture", "texImage2D", "texParameteri", "bindFramebuffer", "framebufferTexture2D", "bindBuffer", "bufferData", "viewport", "enableVertexAttribArray", "vertexAttribPointer", "drawArrays", "uniform1i", "uniform2f", "uniform3f", "uniform1f", "activeTexture", "deleteTexture", "deleteFramebuffer", "deleteBuffer", "deleteProgram"].map((name) => [name, vi.fn()])), {
    createShader: vi.fn(() => ({})), createProgram: vi.fn(() => ({})), createTexture: vi.fn(() => ({})), createFramebuffer: vi.fn(() => ({})), createBuffer: vi.fn(() => ({})), getExtension: vi.fn(() => ({ loseContext: vi.fn() })), getShaderParameter: vi.fn(() => true), getProgramParameter: vi.fn(() => true), checkFramebufferStatus: vi.fn(() => 1), FRAMEBUFFER_COMPLETE: 1, getUniformLocation: vi.fn((_p, name) => name), getError: vi.fn(() => 0), NO_ERROR: 0,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => gl as unknown as WebGLRenderingContext);
  mocks.gate.mockImplementation((_el, cb) => { gate = cb; return mocks.stopGate; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame() { const [id, cb] = [...frames.entries()][0]; frames.delete(id); act(() => cb(100)); }

describe("Fluid lifecycle", () => {
  it("publishes ready only after a successful frame and frees all FBOs", () => {
    const ready = vi.fn(); const { unmount } = render(<FluidSim quality={quality} dyeColors={[[1, 0, 0]]} onReadyChange={ready} />);
    expect(frames.size).toBe(0); expect(ready).not.toHaveBeenCalled(); act(() => gate(true)); frame(); expect(ready).toHaveBeenLastCalledWith(true);
    unmount(); expect(frames.size).toBe(0); expect(gl.deleteTexture).toHaveBeenCalledTimes(8); expect(gl.deleteFramebuffer).toHaveBeenCalledTimes(8); expect(gl.deleteProgram).toHaveBeenCalledTimes(8); expect(gl.deleteBuffer).toHaveBeenCalledOnce();
  });
  it("contains missing float buffers instead of leaving a blank active canvas", () => {
    (gl.getExtension as ReturnType<typeof vi.fn>).mockImplementation((name) => name === "EXT_color_buffer_float" ? null : { loseContext: vi.fn() });
    const ready = vi.fn(); const { container } = render(<FluidSim quality={quality} dyeColors={[[1, 0, 0]]} onReadyChange={ready} />);
    expect(ready).toHaveBeenCalledWith(false); expect(container.querySelector("canvas")).toBeNull(); expect(frames.size).toBe(0);
  });
  it("never reports ready after incomplete framebuffer or GL first-frame errors", () => {
    (gl.checkFramebufferStatus as ReturnType<typeof vi.fn>).mockReturnValue(0);
    const ready = vi.fn(); render(<FluidSim quality={quality} dyeColors={[[1, 0, 0]]} onReadyChange={ready} />);
    expect(ready).toHaveBeenCalledWith(false); expect(ready).not.toHaveBeenCalledWith(true); expect(gl.deleteTexture).toHaveBeenCalledOnce();
  });
});
