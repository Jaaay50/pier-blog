// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CloudSeaTrain, { CLOUDSEA_FRAGMENT } from "./CloudSeaTrain";

const mocks = vi.hoisted(() => ({ gate: vi.fn() }));
vi.mock("@/lib/webgl", () => ({ observeRenderGate: mocks.gate }));
vi.mock("next-intl", () => ({ useLocale: () => "zh" }));

let gates: Array<(visible: boolean) => void>;
let stops: Array<ReturnType<typeof vi.fn>>;
let resizeStops: Array<ReturnType<typeof vi.fn>>;
let frames: Map<number, FrameRequestCallback>;
let gl: Record<string, unknown>;
let getContext: ReturnType<typeof vi.spyOn>;
let lose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  gates = [];
  stops = [];
  resizeStops = [];
  frames = new Map();
  let next = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = next++;
    frames.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("ResizeObserver", class {
    disconnect = vi.fn();
    constructor() { resizeStops.push(this.disconnect); }
    observe = vi.fn();
  });
  mocks.gate.mockImplementation((_element, callback) => {
    gates.push(callback);
    const stop = vi.fn();
    stops.push(stop);
    return stop;
  });
  lose = vi.fn();
  gl = {
    ...Object.fromEntries([
      "shaderSource", "compileShader", "attachShader", "linkProgram", "bindBuffer", "bufferData",
      "useProgram", "enableVertexAttribArray", "vertexAttribPointer", "viewport", "uniform2f",
      "uniform1i", "uniform1f", "drawArrays", "deleteShader", "deleteProgram", "deleteBuffer",
      "deleteTexture", "activeTexture", "bindTexture", "texParameteri", "texImage2D", "pixelStorei",
    ].map((name) => [name, vi.fn()])),
    createShader: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    createTexture: vi.fn(() => ({})),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(() => true),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn((_program, name) => name),
    isContextLost: vi.fn(() => false),
    getError: vi.fn(() => 0),
    NO_ERROR: 0,
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    NEAREST: 9728,
    REPEAT: 10497,
    UNPACK_ALIGNMENT: 3317,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    getExtension: vi.fn(() => ({ loseContext: lose })),
  };
  getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => gl as unknown as WebGL2RenderingContext);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function microtasks() { await act(async () => {}); }
function frame() {
  const first = [...frames.entries()][0];
  expect(first).toBeDefined();
  const [id, callback] = first;
  frames.delete(id);
  act(() => callback(100));
}
function visible(value = true, index = gates.length - 1) { act(() => gates[index](value)); }

describe("Cloud sea look", () => {
  it("keeps the original layered height-field and drops the pulsing brightness", () => {
    expect(CLOUDSEA_FRAGMENT).toContain("layer(");
    expect(CLOUDSEA_FRAGMENT).toContain("background");
    expect(CLOUDSEA_FRAGMENT).toContain("genRaster");
    expect(CLOUDSEA_FRAGMENT).toContain("uNoise");
    expect(CLOUDSEA_FRAGMENT).toContain("/1024.");
    expect(CLOUDSEA_FRAGMENT).not.toMatch(/1\.3\s*\+\s*0\.4\s*\*\s*cos/);
    expect(CLOUDSEA_FRAGMENT).toContain("pivot");
  });
});

describe("Cloud sea runtime lifecycle", () => {
  it("survives StrictMode replay without losing the retained canvas context", () => {
    const ready = vi.fn();
    const { unmount } = render(<StrictMode><CloudSeaTrain isDark={false} onReadyChange={ready} /></StrictMode>);
    expect(getContext).toHaveBeenCalledTimes(2);
    expect(gl.createProgram).toHaveBeenCalledTimes(2);
    expect(lose).not.toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(stops[0]).toHaveBeenCalledOnce();
    expect(resizeStops[0]).toHaveBeenCalledOnce();
    visible(true, 0);
    expect(frames.size).toBe(0);
    visible();
    frame();
    expect(ready).toHaveBeenCalledExactlyOnceWith(true);
    unmount();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    expect(lose).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
    expect(stops[1]).toHaveBeenCalledOnce();
    expect(resizeStops[1]).toHaveBeenCalledOnce();
  });

  it("loops only while visible and updates params without recreating resources", () => {
    const ready = vi.fn();
    render(<CloudSeaTrain isDark={false} onReadyChange={ready} />);
    expect(frames.size).toBe(0);
    expect(ready).not.toHaveBeenCalled();
    visible();
    frame();
    expect(ready).toHaveBeenCalledExactlyOnceWith(true);
    expect(frames.size).toBe(1);
    fireEvent.change(screen.getByRole("slider", { name: /取景/ }), { target: { value: "2.8" } });
    frame();
    expect(gl.uniform1f).toHaveBeenCalledWith("zoom", 2.8);
    expect(gl.createProgram).toHaveBeenCalledOnce();
    visible(false);
    expect(frames.size).toBe(0);
  });

  it("stops observers and GPU work once on context loss and never restarts disposed state", async () => {
    const ready = vi.fn();
    const { container, unmount } = render(<CloudSeaTrain isDark onReadyChange={ready} />);
    visible();
    frame();
    const event = new Event("webglcontextlost", { cancelable: true });
    act(() => container.querySelector("canvas")!.dispatchEvent(event));
    await microtasks();
    expect(event.defaultPrevented).toBe(true);
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(stops[0]).toHaveBeenCalledOnce();
    expect(resizeStops[0]).toHaveBeenCalledOnce();
    visible();
    expect(frames.size).toBe(0);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(container.querySelector("fieldset")!.disabled).toBe(true);
    unmount();
    expect(gl.deleteProgram).toHaveBeenCalledOnce();
    expect(gl.deleteBuffer).toHaveBeenCalledOnce();
    expect(gl.deleteTexture).toHaveBeenCalledOnce();
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  });

  it.each(["context", "compile", "link", "draw", "lost_without_event"] as const)("reports %s failure without a false-ready frame", async (failure) => {
    if (failure === "context") getContext.mockImplementation(() => { throw new Error("context creation failed"); });
    if (failure === "compile") (gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    if (failure === "link") (gl.getProgramParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const ready = vi.fn();
    render(<CloudSeaTrain isDark onReadyChange={ready} />);
    if (failure === "draw" || failure === "lost_without_event") {
      if (failure === "draw") (gl.drawArrays as ReturnType<typeof vi.fn>).mockImplementation(() => { throw new Error("driver failure"); });
      else (gl.isContextLost as ReturnType<typeof vi.fn>).mockReturnValue(true);
      visible();
      frame();
    }
    await microtasks();
    expect(ready).toHaveBeenCalledExactlyOnceWith(false);
    expect(frames.size).toBe(0);
  });

  it("ignores a failed setup callback from the first StrictMode effect", async () => {
    (gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const ready = vi.fn();
    render(<StrictMode><CloudSeaTrain isDark={false} onReadyChange={ready} /></StrictMode>);
    await microtasks();
    expect(ready).not.toHaveBeenCalledWith(false);
    visible();
    frame();
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("restores default framing from the local reset control", () => {
    render(<CloudSeaTrain isDark={false} />);
    visible();
    frame();
    fireEvent.change(screen.getByRole("slider", { name: /取景/ }), { target: { value: "3.1" } });
    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    frame();
    expect(gl.uniform1f).toHaveBeenCalledWith("zoom", 2.2);
  });
});
