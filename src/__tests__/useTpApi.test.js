import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTpApi } from "../hooks/useTpApi";
import { PAL, FONTS } from "../constants";

function setup(shapes = []) {
  const refs = {
    shapesRef: { current: shapes },
    palRef: { current: "warm" },
    deviceRef: { current: "desktop" },
    prefVRef: { current: {} },
  };

  const setShapes = vi.fn((v) => { refs.shapesRef.current = typeof v === "function" ? v(refs.shapesRef.current) : v; });
  const setHist = vi.fn();
  const setFuture = vi.fn();
  const setPal = vi.fn((v) => { refs.palRef.current = v; });
  const setPrefV = vi.fn((v) => { refs.prefVRef.current = typeof v === "function" ? v(refs.prefVRef.current) : v; });
  const setDevice = vi.fn((v) => { refs.deviceRef.current = v; });
  const resetTransientEditorState = vi.fn();

  const { result } = renderHook(() =>
    useTpApi({
      ...refs,
      setShapes,
      setHist,
      setFuture,
      setPal,
      setPrefV,
      setDevice,
      resetTransientEditorState,
    })
  );

  return { result, setShapes, setHist, setFuture, setPal, setPrefV, setDevice, resetTransientEditorState, refs };
}

describe("useTpApi", () => {
  beforeEach(() => localStorage.clear());

  /* ── READ ── */

  it("palette() returns current palette name", () => {
    const { result } = setup();
    expect(result.current.palette()).toBe("warm");
  });

  it("palettes() returns all palette keys", () => {
    const { result } = setup();
    const keys = result.current.palettes();
    expect(keys).toEqual(Object.keys(PAL));
    expect(keys.length).toBeGreaterThan(0);
  });

  it("colors() returns current palette colors", () => {
    const { result } = setup();
    const c = result.current.colors();
    expect(c).toHaveProperty("bg");
    expect(c).toHaveProperty("tx");
    expect(c).toHaveProperty("ac");
  });

  it("shapes() returns empty array initially", () => {
    const { result } = setup();
    expect(result.current.shapes()).toEqual([]);
  });

  it("shapes() returns formatted shape data", () => {
    const shapes = [{ id: "s1", type: "hero", x: 10.7, y: 20, w: 400, h: 200, variant: 1, font: 2, fsize: 1.2, texts: { h: "Hi" }, props: { dark: true } }];
    const { result } = setup(shapes);
    const s = result.current.shapes();
    expect(s).toHaveLength(1);
    expect(s[0].x).toBe(11); // rounded
    expect(s[0].texts.h).toBe("Hi");
    expect(s[0].props.dark).toBe(true);
  });

  it("get() returns shape by id", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 }];
    const { result } = setup(shapes);
    expect(result.current.get("s1")).not.toBeNull();
    expect(result.current.get("s1").type).toBe("hero");
  });

  it("get() returns null for unknown id", () => {
    const { result } = setup();
    expect(result.current.get("nonexistent")).toBeNull();
  });

  it("find() returns ids matching type", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 },
      { id: "s2", type: "card", x: 0, y: 200, w: 300, h: 200 },
      { id: "s3", type: "hero", x: 0, y: 400, w: 400, h: 200 },
    ];
    const { result } = setup(shapes);
    expect(result.current.find("hero")).toEqual(["s1", "s3"]);
    expect(result.current.find("card")).toEqual(["s2"]);
    expect(result.current.find("nonexistent")).toEqual([]);
  });

  it("device() returns current device mode", () => {
    const { result } = setup();
    expect(result.current.device()).toBe("desktop");
  });

  it("fonts() returns font names", () => {
    const { result } = setup();
    const fonts = result.current.fonts();
    expect(fonts.length).toBe(FONTS.length);
    expect(fonts[0]).toBe(FONTS[0].name);
  });

  it("types() returns all component types", () => {
    const { result } = setup();
    const types = result.current.types();
    expect(types.length).toBeGreaterThan(0);
    expect(types).toContain("hero");
  });

  /* ── WRITE ── */

  it("add() creates a shape and returns its id", () => {
    const { result, refs } = setup();
    let id;
    act(() => { id = result.current.add("hero", { x: 50, y: 100 }); });
    expect(typeof id).toBe("string");
    expect(refs.shapesRef.current).toHaveLength(1);
    expect(refs.shapesRef.current[0].type).toBe("hero");
    expect(refs.shapesRef.current[0].x).toBe(50);
  });

  it("remove() deletes a shape by id", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.remove("s1"); });
    expect(refs.shapesRef.current).toHaveLength(0);
  });

  it("update() modifies shape properties", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, variant: 0, font: 0, fsize: 1, texts: {}, props: {} }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.update("s1", { x: 100, variant: 2, texts: { h: "New" } }); });
    const s = refs.shapesRef.current[0];
    expect(s.x).toBe(100);
    expect(s.variant).toBe(2);
    expect(s.texts.h).toBe("New");
  });

  it("setText() sets a text field", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, texts: {} }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.setText("s1", "title", "Hello"); });
    expect(refs.shapesRef.current[0].texts.title).toBe("Hello");
  });

  it("setText() with null deletes text field", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, texts: { title: "Hi" } }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.setText("s1", "title", null); });
    expect(refs.shapesRef.current[0].texts.title).toBeUndefined();
  });

  it("setProp() sets a prop value", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, props: {} }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.setProp("s1", "dark", true); });
    expect(refs.shapesRef.current[0].props.dark).toBe(true);
  });

  it("setFont() sets font index", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, font: 0 }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.setFont("s1", 3); });
    expect(refs.shapesRef.current[0].font).toBe(3);
  });

  it("setFsize() clamps to 0.5-2.0 range", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, fsize: 1 }];
    const { result, refs } = setup(shapes);
    act(() => { result.current.setFsize("s1", 5); });
    expect(refs.shapesRef.current[0].fsize).toBe(2);
    act(() => { result.current.setFsize("s1", 0.1); });
    expect(refs.shapesRef.current[0].fsize).toBe(0.5);
  });

  it("setPalette() changes palette", () => {
    const { result, setPal } = setup();
    act(() => { result.current.setPalette("ocean"); });
    expect(setPal).toHaveBeenCalledWith("ocean");
  });

  it("setPalette() ignores unknown palette", () => {
    const { result, setPal } = setup();
    act(() => { result.current.setPalette("nonexistent"); });
    expect(setPal).not.toHaveBeenCalled();
  });

  it("setDevice() changes device mode", () => {
    const { result, setDevice } = setup();
    act(() => { result.current.setDevice("phone"); });
    expect(setDevice).toHaveBeenCalledWith("phone");
  });

  it("setDevice() ignores invalid mode", () => {
    const { result, setDevice } = setup();
    act(() => { result.current.setDevice("tablet"); });
    expect(setDevice).not.toHaveBeenCalled();
  });

  it("clear() removes all non-code-block shapes", () => {
    const shapes = [
      { id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 },
      { id: "s2", type: "code-block", x: 0, y: 200, w: 400, h: 200 },
    ];
    const { result, refs } = setup(shapes);
    act(() => { result.current.clear(); });
    expect(refs.shapesRef.current).toHaveLength(1);
    expect(refs.shapesRef.current[0].type).toBe("code-block");
  });

  it("reset() clears everything and resets defaults", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 }];
    const { result, refs, setPal, setDevice, resetTransientEditorState } = setup(shapes);
    act(() => { result.current.reset(); });
    expect(refs.shapesRef.current).toHaveLength(0);
    expect(setPal).toHaveBeenCalledWith("warm");
    expect(setDevice).toHaveBeenCalledWith("desktop");
    expect(resetTransientEditorState).toHaveBeenCalled();
  });

  /* ── SAVE / LOAD ── */

  it("save() and load() round-trip state", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200, variant: 0, texts: {}, props: {} }];
    const { result } = setup(shapes);
    let key;
    act(() => { key = result.current.save("test"); });
    expect(key).toBe("tp_save_test");
    expect(localStorage.getItem(key)).toBeTruthy();

    // Load into fresh state
    const { result: r2 } = setup([]);
    let loaded;
    act(() => { loaded = r2.current.load("test"); });
    expect(loaded).toBe(true);
  });

  it("load() returns false for missing save", () => {
    const { result } = setup();
    let loaded;
    act(() => { loaded = result.current.load("nonexistent"); });
    expect(loaded).toBe(false);
  });

  it("saves() lists saved state names", () => {
    const { result } = setup([]);
    act(() => { result.current.save("a"); });
    act(() => { result.current.save("b"); });
    const names = result.current.saves();
    expect(names).toContain("a");
    expect(names).toContain("b");
  });

  it("deleteSave() removes a saved state", () => {
    const { result } = setup([]);
    act(() => { result.current.save("del"); });
    expect(localStorage.getItem("tp_save_del")).toBeTruthy();
    act(() => { result.current.deleteSave("del"); });
    expect(localStorage.getItem("tp_save_del")).toBeNull();
  });

  it("export() returns current state snapshot", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 }];
    const { result } = setup(shapes);
    const exp = result.current.export();
    expect(exp.shapes).toHaveLength(1);
    expect(exp.pal).toBe("warm");
    expect(exp.device).toBe("desktop");
  });

  /* ── UNDO INTEGRATION ── */

  it("add() pushes to undo history", () => {
    const { result, setHist, setFuture } = setup();
    act(() => { result.current.add("hero"); });
    expect(setHist).toHaveBeenCalled();
    expect(setFuture).toHaveBeenCalledWith([]);
  });

  it("remove() pushes to undo history", () => {
    const shapes = [{ id: "s1", type: "hero", x: 0, y: 0, w: 400, h: 200 }];
    const { result, setHist } = setup(shapes);
    act(() => { result.current.remove("s1"); });
    expect(setHist).toHaveBeenCalled();
  });
});
