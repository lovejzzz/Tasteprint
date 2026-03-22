import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewport } from "../hooks/useViewport";

describe("useViewport", () => {
  let origInnerWidth;
  let rafCallbacks;

  beforeEach(() => {
    origInnerWidth = window.innerWidth;
    rafCallbacks = [];
    // Mock rAF to capture and control callbacks
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = rafCallbacks.length + 1;
      rafCallbacks.push(cb);
      return id;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { value: origInnerWidth, writable: true, configurable: true });
    vi.restoreAllMocks();
  });

  function setInnerWidth(w) {
    Object.defineProperty(window, "innerWidth", { value: w, writable: true, configurable: true });
  }

  function flushRaf() {
    const cbs = [...rafCallbacks];
    rafCallbacks.length = 0;
    cbs.forEach((cb) => cb());
  }

  it("returns initial viewport width", () => {
    setInnerWidth(1024);
    const { result } = renderHook(() => useViewport());
    expect(result.current.width).toBe(1024);
  });

  it("returns mobile=true when width < 768", () => {
    setInnerWidth(500);
    const { result } = renderHook(() => useViewport());
    expect(result.current.mobile).toBe(true);
  });

  it("returns mobile=false when width >= 768", () => {
    setInnerWidth(1024);
    const { result } = renderHook(() => useViewport());
    expect(result.current.mobile).toBe(false);
  });

  it("returns mobile=false at exactly 768", () => {
    setInnerWidth(768);
    const { result } = renderHook(() => useViewport());
    expect(result.current.mobile).toBe(false);
  });

  it("updates width on window resize after rAF", () => {
    setInnerWidth(1024);
    const { result } = renderHook(() => useViewport());
    expect(result.current.width).toBe(1024);

    // Simulate resize
    setInnerWidth(600);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    // Before rAF fires, width should still be old
    expect(result.current.width).toBe(1024);

    // Flush rAF
    act(() => {
      flushRaf();
    });

    expect(result.current.width).toBe(600);
    expect(result.current.mobile).toBe(true);
  });

  it("coalesces rapid resize events to one rAF update", () => {
    setInnerWidth(1024);
    const { result } = renderHook(() => useViewport());

    // Fire multiple resize events rapidly
    setInnerWidth(800);
    act(() => { window.dispatchEvent(new Event("resize")); });
    setInnerWidth(600);
    act(() => { window.dispatchEvent(new Event("resize")); });
    setInnerWidth(400);
    act(() => { window.dispatchEvent(new Event("resize")); });

    // cancelAnimationFrame should have been called to debounce
    expect(window.cancelAnimationFrame).toHaveBeenCalled();

    // Only the last resize matters
    act(() => { flushRaf(); });
    expect(result.current.width).toBe(400);
  });

  it("cleans up resize listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useViewport());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("returns reducedMotion=false by default", () => {
    // Default matchMedia returns false for prefers-reduced-motion
    const { result } = renderHook(() => useViewport());
    expect(result.current.reducedMotion).toBe(false);
  });

  it("returns reducedMotion=true when matchMedia matches", () => {
    const listeners = [];
    const origMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: (_, cb) => listeners.push(cb),
      removeEventListener: () => {},
    }));
    const { result } = renderHook(() => useViewport());
    expect(result.current.reducedMotion).toBe(true);
    window.matchMedia = origMatchMedia;
  });

  it("updates reducedMotion when preference changes", () => {
    const listeners = [];
    const origMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: (_, cb) => listeners.push(cb),
      removeEventListener: () => {},
    }));
    const { result } = renderHook(() => useViewport());
    expect(result.current.reducedMotion).toBe(false);

    // Simulate preference change
    act(() => {
      for (const cb of listeners) cb({ matches: true });
    });
    expect(result.current.reducedMotion).toBe(true);
    window.matchMedia = origMatchMedia;
  });
});
