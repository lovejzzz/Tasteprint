import { renderHook, act } from "@testing-library/react";
import { useTpApi } from "../hooks/useTpApi";
import { PAL, LIB, FONTS, VARIANTS } from "../constants";

/** Helper: create mock refs and setters, then render the hook. */
function setup(initialShapes = []) {
  const shapesRef = { current: initialShapes };
  const palRef = { current: "warm" };
  const deviceRef = { current: "desktop" };

  const setShapes = vi.fn((v) => {
    shapesRef.current = typeof v === "function" ? v(shapesRef.current) : v;
  });
  const setHist = vi.fn();
  const setFuture = vi.fn();
  const setPal = vi.fn((v) => { palRef.current = v; });
  const setDevice = vi.fn((v) => { deviceRef.current = v; });
  const resetTransientEditorState = vi.fn();

  const { result } = renderHook(() =>
    useTpApi({
      shapesRef, palRef, deviceRef,
      setShapes, setHist, setFuture, setPal, setDevice,
      resetTransientEditorState,
    }),
  );

  return {
    tp: result.current,
    shapesRef, palRef, deviceRef,
    setShapes, setHist, setFuture, setPal, setDevice,
    resetTransientEditorState,
  };
}

describe("useTpApi", () => {
  // ---- READ methods ----
  test("palette() returns current palette name", () => {
    const { tp } = setup();
    expect(tp.palette()).toBe("warm");
  });

  test("palettes() lists all palette keys", () => {
    const { tp } = setup();
    expect(tp.palettes()).toEqual(Object.keys(PAL));
  });

  test("colors() returns a copy of current palette colors", () => {
    const { tp } = setup();
    const c = tp.colors();
    expect(c).toEqual(PAL.warm);
    // Should be a copy, not the same reference
    c.bg = "modified";
    expect(PAL.warm.bg).not.toBe("modified");
  });

  test("shapes() returns empty array when no shapes", () => {
    const { tp } = setup();
    expect(tp.shapes()).toEqual([]);
  });

  test("device() returns current device mode", () => {
    const { tp } = setup();
    expect(tp.device()).toBe("desktop");
  });

  test("fonts() returns font name strings", () => {
    const { tp } = setup();
    const names = tp.fonts();
    expect(names.length).toBe(FONTS.length);
    expect(names[0]).toBe(FONTS[0].name);
  });

  test("types() returns all component types from LIB", () => {
    const { tp } = setup();
    const types = tp.types();
    expect(types.length).toBeGreaterThan(0);
    // Every type should be a string
    types.forEach((t) => expect(typeof t).toBe("string"));
  });

  test("variants() returns array for known type", () => {
    const { tp } = setup();
    const v = tp.variants("button");
    expect(v).toEqual(VARIANTS.button);
  });

  test("variants() returns empty array for unknown type", () => {
    const { tp } = setup();
    expect(tp.variants("nonexistent")).toEqual([]);
  });

  test("get() returns null for missing id", () => {
    const { tp } = setup();
    expect(tp.get("no-such-id")).toBeNull();
  });

  test("find() returns empty for no matches", () => {
    const { tp } = setup();
    expect(tp.find("button")).toEqual([]);
  });

  // ---- WRITE methods ----
  test("add() creates a shape and returns its id", () => {
    const { tp, setShapes, setHist } = setup();
    let id;
    act(() => { id = tp.add("button", { x: 50, y: 60 }); });
    expect(typeof id).toBe("string");
    expect(setShapes).toHaveBeenCalled();
    expect(setHist).toHaveBeenCalled();
  });

  test("add() uses library sizes as defaults", () => {
    const { tp, shapesRef } = setup();
    // Find button size from LIB
    let libW, libH;
    LIB.forEach((cat) =>
      cat.items.forEach((it) => {
        if (it.type === "button") { libW = it.w; libH = it.h; }
      }),
    );
    act(() => { tp.add("button"); });
    const added = shapesRef.current[0];
    if (libW) expect(added.w).toBe(libW);
    if (libH) expect(added.h).toBe(libH);
  });

  test("remove() deletes a shape by id", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "button", x: 0, y: 0, w: 100, h: 40 },
    ]);
    act(() => { tp.remove("a"); });
    expect(shapesRef.current.find((s) => s.id === "a")).toBeUndefined();
  });

  test("update() changes shape properties", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "button", x: 0, y: 0, w: 100, h: 40, variant: 0 },
    ]);
    act(() => { tp.update("a", { x: 200, variant: 3 }); });
    const s = shapesRef.current.find((sh) => sh.id === "a");
    expect(s.x).toBe(200);
    expect(s.variant).toBe(3);
  });

  test("update() merges texts and props", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "card", x: 0, y: 0, w: 200, h: 200, texts: { title: "old" }, props: { color: "red" } },
    ]);
    act(() => { tp.update("a", { texts: { subtitle: "new" }, props: { size: "lg" } }); });
    const s = shapesRef.current.find((sh) => sh.id === "a");
    expect(s.texts.title).toBe("old");
    expect(s.texts.subtitle).toBe("new");
    expect(s.props.color).toBe("red");
    expect(s.props.size).toBe("lg");
  });

  test("setText() sets a text key on a shape", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 300 },
    ]);
    act(() => { tp.setText("a", "headline", "Hello"); });
    expect(shapesRef.current[0].texts.headline).toBe("Hello");
  });

  test("setText() with null deletes the key", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 300, texts: { headline: "Hi" } },
    ]);
    act(() => { tp.setText("a", "headline", null); });
    expect(shapesRef.current[0].texts).not.toHaveProperty("headline");
  });

  test("setProp() sets a prop key", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "card", x: 0, y: 0, w: 200, h: 200 },
    ]);
    act(() => { tp.setProp("a", "rounded", true); });
    expect(shapesRef.current[0].props.rounded).toBe(true);
  });

  test("setFont() clamps and sets font index", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 300, font: 0 },
    ]);
    act(() => { tp.setFont("a", 5); });
    expect(shapesRef.current[0].font).toBe(5);
  });

  test("setFsize() clamps between 0.5 and 2", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 300, fsize: 1 },
    ]);
    act(() => { tp.setFsize("a", 0.1); });
    expect(shapesRef.current[0].fsize).toBe(0.5);
    act(() => { tp.setFsize("a", 5); });
    expect(shapesRef.current[0].fsize).toBe(2);
  });

  test("clear() removes non-code-block shapes", () => {
    const { tp, shapesRef } = setup([
      { id: "a", type: "button", x: 0, y: 0, w: 100, h: 40 },
      { id: "b", type: "code-block", x: 0, y: 0, w: 300, h: 200 },
    ]);
    act(() => { tp.clear(); });
    expect(shapesRef.current.length).toBe(1);
    expect(shapesRef.current[0].type).toBe("code-block");
  });

  // ---- PALETTE / DEVICE ----
  test("setPalette() updates palette for valid name", () => {
    const { tp, setPal } = setup();
    act(() => { tp.setPalette("noir"); });
    expect(setPal).toHaveBeenCalledWith("noir");
  });

  test("setPalette() ignores invalid name", () => {
    const { tp, setPal } = setup();
    act(() => { tp.setPalette("nonexistent"); });
    expect(setPal).not.toHaveBeenCalled();
  });

  test("setDevice() updates for valid mode", () => {
    const { tp, setDevice } = setup();
    act(() => { tp.setDevice("phone"); });
    expect(setDevice).toHaveBeenCalledWith("phone");
  });

  test("setDevice() ignores invalid mode", () => {
    const { tp, setDevice } = setup();
    act(() => { tp.setDevice("tablet"); });
    expect(setDevice).not.toHaveBeenCalled();
  });

  // ---- SAVE / LOAD / RESET ----
  test("save() persists to localStorage", () => {
    const { tp } = setup([{ id: "a", type: "button", x: 0, y: 0, w: 100, h: 40 }]);
    act(() => { tp.save("test1"); });
    const raw = localStorage.getItem("tp_save_test1");
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw);
    expect(data.pal).toBe("warm");
    expect(data.shapes.length).toBe(1);
  });

  test("save() without name uses default key", () => {
    const { tp } = setup();
    act(() => { tp.save(); });
    expect(localStorage.getItem("tp_save_default")).toBeTruthy();
  });

  test("load() restores saved state", () => {
    const { tp } = setup();
    localStorage.setItem(
      "tp_save_test2",
      JSON.stringify({ shapes: [{ id: "x", type: "card", x: 10, y: 10, w: 200, h: 200 }], pal: "cool", device: "phone" }),
    );
    let result;
    act(() => { result = tp.load("test2"); });
    expect(result).toBe(true);
  });

  test("load() returns false for missing key", () => {
    const { tp } = setup();
    let result;
    act(() => { result = tp.load("nopenopenope"); });
    expect(result).toBe(false);
  });

  test("saves() lists saved keys", () => {
    const { tp } = setup();
    localStorage.setItem("tp_save_alpha", "{}");
    localStorage.setItem("tp_save_beta", "{}");
    const keys = tp.saves();
    expect(keys).toContain("alpha");
    expect(keys).toContain("beta");
  });

  test("deleteSave() removes a save", () => {
    const { tp } = setup();
    localStorage.setItem("tp_save_del", "{}");
    act(() => { tp.deleteSave("del"); });
    expect(localStorage.getItem("tp_save_del")).toBeNull();
  });

  test("reset() clears shapes and resets defaults", () => {
    const { tp, shapesRef, setPal, setDevice, resetTransientEditorState } = setup([
      { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 300 },
    ]);
    act(() => { tp.reset(); });
    expect(shapesRef.current).toEqual([]);
    expect(setPal).toHaveBeenCalledWith("warm");
    expect(setDevice).toHaveBeenCalledWith("desktop");
    expect(resetTransientEditorState).toHaveBeenCalled();
  });

  test("export() returns current state snapshot", () => {
    const shapes = [{ id: "a", type: "button", x: 0, y: 0, w: 100, h: 40 }];
    const { tp } = setup(shapes);
    const out = tp.export();
    expect(out.shapes).toBe(shapes);
    expect(out.pal).toBe("warm");
    expect(out.device).toBe("desktop");
  });

  // ---- Undo awareness ----
  test("write operations push to history", () => {
    const { tp, setHist, setFuture } = setup();
    act(() => { tp.add("button"); });
    expect(setHist).toHaveBeenCalled();
    expect(setFuture).toHaveBeenCalledWith([]);
  });
});
