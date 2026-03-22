import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboard } from "../hooks/useKeyboard";

function makeCallbacks() {
  return {
    onDel: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    dupShape: vi.fn(),
    selAll: new Set(),
    setShapes: vi.fn(),
    sel: null,
    randomize: vi.fn(),
    randomizeAll: vi.fn(),
    undoRandomize: vi.fn(),
    cycleMood: vi.fn(),
    toggleLock: vi.fn(),
    undoDesign: vi.fn(),
    cycleVariation: vi.fn(),
    candidates: {},
    setStyleSource: vi.fn(),
  };
}

function fire(key, opts = {}) {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, ...opts });
  window.dispatchEvent(e);
}

describe("useKeyboard", () => {
  let cbs;

  beforeEach(() => {
    cbs = makeCallbacks();
  });

  it("calls onDel on Backspace", () => {
    renderHook(() => useKeyboard(cbs));
    fire("Backspace");
    expect(cbs.onDel).toHaveBeenCalledTimes(1);
  });

  it("calls onDel on Delete", () => {
    renderHook(() => useKeyboard(cbs));
    fire("Delete");
    expect(cbs.onDel).toHaveBeenCalledTimes(1);
  });

  it("calls undo on Cmd+Z", () => {
    renderHook(() => useKeyboard(cbs));
    fire("z", { metaKey: true });
    expect(cbs.undo).toHaveBeenCalledTimes(1);
  });

  it("calls redo on Cmd+Shift+Z", () => {
    renderHook(() => useKeyboard(cbs));
    fire("z", { metaKey: true, shiftKey: true });
    expect(cbs.redo).toHaveBeenCalledTimes(1);
  });

  it("calls dupShape on Cmd+D", () => {
    renderHook(() => useKeyboard(cbs));
    fire("d", { metaKey: true });
    expect(cbs.dupShape).toHaveBeenCalledTimes(1);
  });

  it("calls randomize on 'r' when sel is set", () => {
    cbs.sel = "shape1";
    renderHook(() => useKeyboard(cbs));
    fire("r");
    expect(cbs.randomize).toHaveBeenCalledWith("shape1");
  });

  it("does NOT call randomize on 'r' when sel is null", () => {
    renderHook(() => useKeyboard(cbs));
    fire("r");
    expect(cbs.randomize).not.toHaveBeenCalled();
  });

  it("calls randomizeAll on Shift+R", () => {
    renderHook(() => useKeyboard(cbs));
    fire("R", { shiftKey: true });
    expect(cbs.randomizeAll).toHaveBeenCalledTimes(1);
  });

  it("calls undoRandomize on 'u'", () => {
    renderHook(() => useKeyboard(cbs));
    fire("u");
    expect(cbs.undoRandomize).toHaveBeenCalledTimes(1);
  });

  it("calls cycleMood on 'm'", () => {
    renderHook(() => useKeyboard(cbs));
    fire("m");
    expect(cbs.cycleMood).toHaveBeenCalledTimes(1);
  });

  it("calls toggleLock on 'l' when sel is set", () => {
    cbs.sel = "shape1";
    renderHook(() => useKeyboard(cbs));
    fire("l");
    expect(cbs.toggleLock).toHaveBeenCalledWith("shape1");
  });

  it("calls undoDesign on 'z' when sel is set", () => {
    cbs.sel = "shape1";
    renderHook(() => useKeyboard(cbs));
    fire("z");
    expect(cbs.undoDesign).toHaveBeenCalledWith("shape1");
  });

  it("calls setStyleSource on 'c' when sel is set", () => {
    cbs.sel = "shape1";
    renderHook(() => useKeyboard(cbs));
    fire("c");
    expect(cbs.setStyleSource).toHaveBeenCalledWith("shape1");
  });

  it("moves selected shapes with arrow keys", () => {
    cbs.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(cbs));
    fire("ArrowRight");
    expect(cbs.setShapes).toHaveBeenCalledTimes(1);
    // The callback should be a function
    const fn = cbs.setShapes.mock.calls[0][0];
    expect(typeof fn).toBe("function");
  });

  it("moves by 10px with Shift+Arrow", () => {
    cbs.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(cbs));
    fire("ArrowRight", { shiftKey: true });
    const fn = cbs.setShapes.mock.calls[0][0];
    const result = fn([{ id: "s1", x: 0, y: 0 }]);
    expect(result[0].x).toBe(10);
  });

  it("moves by 1px without Shift", () => {
    cbs.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(cbs));
    fire("ArrowUp");
    const fn = cbs.setShapes.mock.calls[0][0];
    const result = fn([{ id: "s1", x: 0, y: 5 }]);
    expect(result[0].y).toBe(4);
  });

  it("groups with Cmd+G when multiple selected", () => {
    cbs.selAll = new Set(["s1", "s2"]);
    renderHook(() => useKeyboard(cbs));
    fire("g", { metaKey: true });
    expect(cbs.setShapes).toHaveBeenCalledTimes(1);
  });

  it("ungroups with Cmd+Shift+G", () => {
    cbs.selAll = new Set(["s1", "s2"]);
    renderHook(() => useKeyboard(cbs));
    fire("g", { metaKey: true, shiftKey: true });
    expect(cbs.setShapes).toHaveBeenCalledTimes(1);
    const fn = cbs.setShapes.mock.calls[0][0];
    const result = fn([{ id: "s1", group: "g1" }, { id: "s2", group: "g1" }]);
    expect(result[0].group).toBeUndefined();
    expect(result[1].group).toBeUndefined();
  });

  it("Delete does not fall through to nudge when shapes are selected", () => {
    cbs.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(cbs));
    fire("Delete");
    expect(cbs.onDel).toHaveBeenCalledTimes(1);
    expect(cbs.setShapes).not.toHaveBeenCalled();
  });

  it("Cmd+Z does not fall through to other handlers", () => {
    cbs.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(cbs));
    fire("z", { metaKey: true });
    expect(cbs.undo).toHaveBeenCalledTimes(1);
    expect(cbs.setShapes).not.toHaveBeenCalled();
  });

  it("Cmd+D does not fall through to other handlers", () => {
    cbs.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(cbs));
    fire("d", { metaKey: true });
    expect(cbs.dupShape).toHaveBeenCalledTimes(1);
    expect(cbs.setShapes).not.toHaveBeenCalled();
  });

  it("cleans up listener on unmount", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useKeyboard(cbs));
    unmount();
    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
    spy.mockRestore();
  });
});
