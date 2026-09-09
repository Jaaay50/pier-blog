// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { observeRenderGate } from "./visibility";
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("render gate", () => {
  it("waits for intersection and combines page visibility without duplicate notifications", () => {
    let intersection: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class { constructor(cb: IntersectionObserverCallback) { intersection = cb; } observe = vi.fn(); disconnect = disconnect; });
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false), callback = vi.fn();
    const dispose = observeRenderGate(document.createElement("div"), callback);
    expect(callback).not.toHaveBeenCalled();
    intersection([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); expect(callback).toHaveBeenLastCalledWith(true);
    hidden.mockReturnValue(true); document.dispatchEvent(new Event("visibilitychange")); expect(callback).toHaveBeenLastCalledWith(false);
    intersection([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver); expect(callback).toHaveBeenCalledTimes(2);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event("visibilitychange")); expect(callback).toHaveBeenCalledTimes(2);
    intersection([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); expect(callback).toHaveBeenLastCalledWith(true);
    dispose(); expect(disconnect).toHaveBeenCalledOnce();
    document.dispatchEvent(new Event("visibilitychange")); expect(callback).toHaveBeenCalledTimes(3);
  });
});
