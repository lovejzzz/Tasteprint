import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDesigner } from "../hooks/useDesigner";
import { DESIGN_MOODS } from "../utils";

// Minimal palette for tests
const PALETTE = { bg: "#FFF8F2", tx: "#3D2C2C", ac: "#E07A5F", mu: "#8D99AE", su: "#6B9080", bd: "#D4C5B9", card: "#FFFFFF" };

function makeRefs(shapes = [], prefV = {}, pal = PALETTE, selAll = new Set()) {
  return {
    shapesRef: { current: shapes },
    prefVRef: { current: prefV },
    pRef: { current: pal },
    selAllRef: { current: selAll },
  };
}

function setup(shapes = [], opts = {}) {
  const setShapes = vi.fn((fn) => {
    if (typeof fn === "function") {
      const result = fn(refs.shapesRef.current);
      refs.shapesRef.current = result;
      return result;
    }
    refs.shapesRef.current = fn;
  });
  const setPrefV = vi.fn((fn) => {
    if (typeof fn === "function") fn(refs.prefVRef.current);
  });
  const refs = makeRefs(shapes, opts.prefV || {}, opts.pal || PALETTE, opts.selAll || new Set());

  const { result } = renderHook(() =>
    useDesigner({
      ...refs,
      setShapes,
      setPrefV,
    })
  );

  return { result, setShapes, setPrefV, refs };
}

describe("useDesigner", () => {
  it("initializes with default state", () => {
    const { result } = setup();
    expect(result.current.designMood).toBe("auto");
    expect(result.current.styleSource).toBeNull();
    expect(result.current.lockedShapes).toBeInstanceOf(Set);
    expect(result.current.lockedShapes.size).toBe(0);
    expect(result.current.candidates).toEqual({});
    expect(result.current.lastRandomizeStats).toBeNull();
  });

  it("exposes expected callback functions", () => {
    const { result } = setup();
    const fns = ["randomize", "randomizeAll", "undoRandomize", "undoDesign",
      "toggleLock", "copyStyle", "cycleVariation", "cycleMood", "resetDesignerState"];
    for (const fn of fns) {
      expect(typeof result.current[fn]).toBe("function");
    }
  });

  it("toggleLock adds and removes shape IDs", () => {
    const { result } = setup();
    act(() => result.current.toggleLock("s1"));
    expect(result.current.lockedShapes.has("s1")).toBe(true);
    act(() => result.current.toggleLock("s1"));
    expect(result.current.lockedShapes.has("s1")).toBe(false);
  });

  it("toggleLock handles multiple shapes independently", () => {
    const { result } = setup();
    act(() => result.current.toggleLock("s1"));
    act(() => result.current.toggleLock("s2"));
    expect(result.current.lockedShapes.has("s1")).toBe(true);
    expect(result.current.lockedShapes.has("s2")).toBe(true);
    act(() => result.current.toggleLock("s1"));
    expect(result.current.lockedShapes.has("s1")).toBe(false);
    expect(result.current.lockedShapes.has("s2")).toBe(true);
  });

  it("cycleMood advances through DESIGN_MOODS", () => {
    const { result } = setup();
    expect(result.current.designMood).toBe("auto");
    act(() => result.current.cycleMood());
    // Should advance from auto (index in DESIGN_MOODS) to next
    const autoIdx = DESIGN_MOODS.findIndex(m => m.id === "auto");
    const expectedMood = DESIGN_MOODS[(autoIdx + 1) % DESIGN_MOODS.length].id;
    expect(result.current.designMood).toBe(expectedMood);
  });

  it("cycleMood wraps around", () => {
    const { result } = setup();
    // Cycle through all moods + 1 to wrap
    for (let i = 0; i < DESIGN_MOODS.length; i++) {
      act(() => result.current.cycleMood());
    }
    // Should be back to original
    expect(result.current.designMood).toBe("auto");
  });

  it("setDesignMood updates mood directly", () => {
    const { result } = setup();
    act(() => result.current.setDesignMood("minimal"));
    expect(result.current.designMood).toBe("minimal");
  });

  it("resetDesignerState clears all transient state", () => {
    const { result } = setup();
    // Set some state first
    act(() => {
      result.current.toggleLock("s1");
      result.current.setDesignMood("bold");
      result.current.setStyleSource("src1");
    });
    expect(result.current.lockedShapes.size).toBe(1);
    expect(result.current.styleSource).toBe("src1");

    act(() => result.current.resetDesignerState());
    expect(result.current.lockedShapes.size).toBe(0);
    expect(result.current.styleSource).toBeNull();
    expect(result.current.candidates).toEqual({});
    expect(result.current.lastRandomizeStats).toBeNull();
  });

  it("randomize on a single shape generates candidates", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} }];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.randomize("s1"));

    // Should have 3 candidates for s1
    expect(result.current.candidates["s1"]).toBeDefined();
    expect(result.current.candidates["s1"].length).toBe(3);
    // setShapes should have been called to apply first candidate
    expect(setShapes).toHaveBeenCalled();
  });

  it("randomize candidate has valid structure", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} }];
    const { result } = setup(shapes);

    act(() => result.current.randomize("s1"));

    const cand = result.current.candidates["s1"][0];
    expect(typeof cand.variant).toBe("number");
    expect(typeof cand.font).toBe("number");
    expect(typeof cand.fsize).toBe("number");
    expect(cand.variant).toBeGreaterThanOrEqual(0);
    expect(cand.fsize).toBeGreaterThanOrEqual(0.5);
    expect(cand.fsize).toBeLessThanOrEqual(2);
  });

  it("cycleVariation advances through candidates", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} }];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.randomize("s1"));
    const callsBefore = setShapes.mock.calls.length;

    act(() => result.current.cycleVariation("s1"));
    expect(setShapes.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("cycleVariation is a no-op without candidates", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400 }];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.cycleVariation("s1"));
    expect(setShapes).not.toHaveBeenCalled();
  });

  it("randomize is a no-op for unknown shape ID", () => {
    const { result, setShapes } = setup([]);
    act(() => result.current.randomize("nonexistent"));
    expect(setShapes).not.toHaveBeenCalled();
  });

  it("randomizeAll calls setShapes for all shapes", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
      { id: "s2", type: "card", x: 0, y: 400, w: 400, h: 300, variant: 0, font: 0, fsize: 1, props: {} },
    ];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.randomizeAll());

    expect(setShapes).toHaveBeenCalled();
    expect(result.current.lastRandomizeStats).not.toBeNull();
    expect(result.current.lastRandomizeStats.count).toBe(2);
    expect(result.current.lastRandomizeStats.skipped).toBe(0);
  });

  it("randomizeAll skips locked shapes", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
      { id: "s2", type: "card", x: 0, y: 400, w: 400, h: 300, variant: 0, font: 0, fsize: 1, props: {} },
    ];
    const { result } = setup(shapes);

    act(() => result.current.toggleLock("s1"));
    act(() => result.current.randomizeAll());

    expect(result.current.lastRandomizeStats.count).toBe(1);
    expect(result.current.lastRandomizeStats.skipped).toBe(1);
  });

  it("randomizeAll is a no-op on empty canvas", () => {
    const { result, setShapes } = setup([]);
    act(() => result.current.randomizeAll());
    expect(setShapes).not.toHaveBeenCalled();
  });

  it("undoRandomize restores previous state after randomizeAll", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
    ];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.randomizeAll());
    const callsAfterRnd = setShapes.mock.calls.length;

    act(() => result.current.undoRandomize());
    expect(setShapes.mock.calls.length).toBeGreaterThan(callsAfterRnd);
  });

  it("undoRandomize is a no-op without prior randomization", () => {
    const { result, setShapes } = setup([]);
    act(() => result.current.undoRandomize());
    expect(setShapes).not.toHaveBeenCalled();
  });

  it("copyStyle transfers style from source to target", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 2, font: 3, fsize: 1.5, props: { showImage: true }, dStyles: { shadow: "2px" } },
      { id: "s2", type: "hero", x: 0, y: 400, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
    ];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.copyStyle("s1", "s2"));
    expect(setShapes).toHaveBeenCalled();
  });

  it("copyStyle is a no-op for unknown source", () => {
    const shapes = [
      { id: "s2", type: "hero", x: 0, y: 400, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
    ];
    const { result, setShapes } = setup(shapes);

    act(() => result.current.copyStyle("nonexistent", "s2"));
    expect(setShapes).not.toHaveBeenCalled();
  });

  it("setStyleSource updates and copyStyle clears it", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
      { id: "s2", type: "hero", x: 0, y: 400, w: 1280, h: 400, variant: 0, font: 0, fsize: 1, props: {} },
    ];
    const { result } = setup(shapes);

    act(() => result.current.setStyleSource("s1"));
    expect(result.current.styleSource).toBe("s1");

    act(() => result.current.copyStyle("s1", "s2"));
    expect(result.current.styleSource).toBeNull();
  });
});
