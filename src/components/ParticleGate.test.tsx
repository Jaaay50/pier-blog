// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PARTICLE_GATE_SCRIPT, ParticleGateScript } from "./ParticleGate";

function runGate() {
  new Function(PARTICLE_GATE_SCRIPT)();
}

describe("ParticleGateScript", () => {
  let loseContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loseContext = vi.fn();
    vi.useFakeTimers();
    document.documentElement.removeAttribute("data-gpu-tier");
    document.documentElement.removeAttribute("data-particles-ready");
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query.includes("pointer: coarse") ? false : false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 8 });
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 8 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as WebGLRenderingContext);
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-gpu-tier");
    document.documentElement.removeAttribute("data-particles-ready");
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("emits a blocking inline script with the same source the tests execute", () => {
    const { container } = render(<ParticleGateScript />);
    const script = container.querySelector("script");
    expect(script?.innerHTML).toBe(PARTICLE_GATE_SCRIPT);
    expect(script?.hasAttribute("async")).toBe(false);
    expect(script?.hasAttribute("defer")).toBe(false);
  });

  it("marks a capable desktop as pending and releases the probe context", () => {
    runGate();
    expect(document.documentElement.getAttribute("data-gpu-tier")).toBe("high");
    expect(document.documentElement.getAttribute("data-particles-ready")).toBe("pending");
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("does not hide the title when WebGL is missing", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    runGate();
    expect(document.documentElement.getAttribute("data-gpu-tier")).toBe("high");
    expect(document.documentElement.hasAttribute("data-particles-ready")).toBe(false);
  });

  it("does not hide the title when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    runGate();
    expect(document.documentElement.hasAttribute("data-particles-ready")).toBe(false);
  });

  it("does not hide the title on low-tier devices", () => {
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: 2 });
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 2 });
    runGate();
    expect(document.documentElement.getAttribute("data-gpu-tier")).toBe("low");
    expect(document.documentElement.hasAttribute("data-particles-ready")).toBe(false);
  });

  it("clears a stale pending mark after 8s if Hero never arms it", () => {
    runGate();
    expect(document.documentElement.getAttribute("data-particles-ready")).toBe("pending");
    vi.advanceTimersByTime(7999);
    expect(document.documentElement.getAttribute("data-particles-ready")).toBe("pending");
    vi.advanceTimersByTime(1);
    expect(document.documentElement.hasAttribute("data-particles-ready")).toBe(false);
  });

  it("leaves an armed or live mark alone when the fallback timer fires", () => {
    runGate();
    document.documentElement.setAttribute("data-particles-ready", "armed");
    vi.advanceTimersByTime(8000);
    expect(document.documentElement.getAttribute("data-particles-ready")).toBe("armed");
  });
});
