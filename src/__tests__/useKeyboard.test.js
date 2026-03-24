import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboard } from "../hooks/useKeyboard";

/**
 * Helper: create default mock props for useKeyboard.
 */
function makeProps(overrides = {}) {
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
    ...overrides,
  };
}

/** Fire a keyboard event on window. */
function press(key, opts = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  window.dispatchEvent(event);
}

describe("useKeyboard", () => {
  let props;

  beforeEach(() => {
    props = makeProps();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onDel on Delete key", () => {
    renderHook(() => useKeyboard(props));
    press("Delete");
    expect(props.onDel).toHaveBeenCalledTimes(1);
  });

  it("calls onDel on Backspace key", () => {
    renderHook(() => useKeyboard(props));
    press("Backspace");
    expect(props.onDel).toHaveBeenCalledTimes(1);
  });

  it("calls undo on Cmd+Z", () => {
    renderHook(() => useKeyboard(props));
    press("z", { metaKey: true });
    expect(props.undo).toHaveBeenCalledTimes(1);
  });

  it("calls redo on Cmd+Shift+Z", () => {
    renderHook(() => useKeyboard(props));
    press("z", { metaKey: true, shiftKey: true });
    expect(props.redo).toHaveBeenCalledTimes(1);
  });

  it("calls dupShape on Cmd+D", () => {
    renderHook(() => useKeyboard(props));
    press("d", { metaKey: true });
    expect(props.dupShape).toHaveBeenCalledTimes(1);
  });

  it("calls randomize on R with selection", () => {
    props.sel = "shape1";
    renderHook(() => useKeyboard(props));
    press("r");
    expect(props.randomize).toHaveBeenCalledWith("shape1");
  });

  it("does not call randomize on R without selection", () => {
    renderHook(() => useKeyboard(props));
    press("r");
    expect(props.randomize).not.toHaveBeenCalled();
  });

  it("calls randomizeAll on Shift+R", () => {
    renderHook(() => useKeyboard(props));
    press("R", { shiftKey: true });
    expect(props.randomizeAll).toHaveBeenCalledTimes(1);
  });

  it("calls undoRandomize on U", () => {
    renderHook(() => useKeyboard(props));
    press("u");
    expect(props.undoRandomize).toHaveBeenCalledTimes(1);
  });

  it("calls cycleMood on M", () => {
    renderHook(() => useKeyboard(props));
    press("m");
    expect(props.cycleMood).toHaveBeenCalledTimes(1);
  });

  it("calls toggleLock on L with selection", () => {
    props.sel = "shape1";
    renderHook(() => useKeyboard(props));
    press("l");
    expect(props.toggleLock).toHaveBeenCalledWith("shape1");
  });

  it("calls undoDesign on Z with selection (no modifier)", () => {
    props.sel = "shape1";
    renderHook(() => useKeyboard(props));
    press("z");
    expect(props.undoDesign).toHaveBeenCalledWith("shape1");
  });

  it("calls setStyleSource on C with selection", () => {
    props.sel = "shape1";
    renderHook(() => useKeyboard(props));
    press("c");
    expect(props.setStyleSource).toHaveBeenCalledWith("shape1");
  });

  it("calls cycleVariation on ArrowRight with candidates (no shift)", () => {
    props.sel = "shape1";
    props.candidates = { shape1: [0, 1, 2] };
    renderHook(() => useKeyboard(props));
    press("ArrowRight");
    expect(props.cycleVariation).toHaveBeenCalledWith("shape1");
  });

  it("does NOT call cycleVariation on Shift+ArrowRight (nudge takes priority)", () => {
    props.sel = "shape1";
    props.selAll = new Set(["shape1"]);
    props.candidates = { shape1: [0, 1, 2] };
    renderHook(() => useKeyboard(props));
    press("ArrowRight", { shiftKey: true });
    expect(props.cycleVariation).not.toHaveBeenCalled();
    // Instead, setShapes should be called for nudge
    expect(props.setShapes).toHaveBeenCalled();
  });

  it("nudges selected shapes by 1px on Arrow keys", () => {
    props.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(props));
    press("ArrowRight");
    expect(props.setShapes).toHaveBeenCalled();
  });

  it("nudges selected shapes by 10px on Shift+Arrow keys", () => {
    props.selAll = new Set(["s1"]);
    let updater;
    props.setShapes = vi.fn(fn => { updater = fn; });
    renderHook(() => useKeyboard(props));
    press("ArrowDown", { shiftKey: true });
    expect(props.setShapes).toHaveBeenCalled();
    // Verify the updater moves by 10
    const result = updater([{ id: "s1", x: 100, y: 100 }]);
    expect(result[0].y).toBe(110);
  });

  it("groups selected shapes on Cmd+G", () => {
    props.selAll = new Set(["s1", "s2"]);
    renderHook(() => useKeyboard(props));
    press("g", { metaKey: true });
    expect(props.setShapes).toHaveBeenCalled();
  });

  it("ungroups on Cmd+Shift+G", () => {
    props.selAll = new Set(["s1"]);
    renderHook(() => useKeyboard(props));
    press("g", { metaKey: true, shiftKey: true });
    expect(props.setShapes).toHaveBeenCalled();
  });

  it("does not fire designer shortcuts while editing text", () => {
    // Simulate an active input element (more reliable in jsdom than contentEditable)
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    props.sel = "shape1";
    renderHook(() => useKeyboard(props));
    press("r");
    expect(props.randomize).not.toHaveBeenCalled();

    // Cleanup
    input.blur();
    document.body.removeChild(input);
  });
});
