import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "../hooks/useHistory";

describe("useHistory", () => {
  it("initializes with the given value", () => {
    const { result } = renderHook(() => useHistory("init"));
    expect(result.current.current).toBe("init");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("push adds to history and clears future", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.push("b"));
    expect(result.current.current).toBe("b");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("set replaces current without affecting history", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.set("b"));
    expect(result.current.current).toBe("b");
    expect(result.current.canUndo).toBe(false);
  });

  it("undo restores previous state", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.push("b"));
    act(() => result.current.undo());
    expect(result.current.current).toBe("a");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("redo restores undone state", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.push("b"));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.current).toBe("b");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("undo is a no-op when history is empty", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.undo());
    expect(result.current.current).toBe("a");
  });

  it("redo is a no-op when future is empty", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.redo());
    expect(result.current.current).toBe("a");
  });

  it("push after undo clears the redo stack", () => {
    const { result } = renderHook(() => useHistory("a"));
    act(() => result.current.push("b"));
    act(() => result.current.push("c"));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.push("d"));
    expect(result.current.current).toBe("d");
    expect(result.current.canRedo).toBe(false);
  });

  it("limits history to 41 past entries", () => {
    const { result } = renderHook(() => useHistory(0));
    for (let i = 1; i <= 50; i++) {
      act(() => result.current.push(i));
    }
    expect(result.current.current).toBe(50);
    // slice(-40) keeps 40 + appends prev = 41 past entries
    let undoCount = 0;
    while (result.current.canUndo) {
      act(() => result.current.undo());
      undoCount++;
    }
    expect(undoCount).toBe(41);
    // Earliest reachable state: pushed 1-50, kept last 41 past: 9-49
    expect(result.current.current).toBe(9);
  });

  it("handles complex object values", () => {
    const { result } = renderHook(() => useHistory({ shapes: [] }));
    act(() => result.current.push({ shapes: [{ id: 1 }] }));
    act(() => result.current.push({ shapes: [{ id: 1 }, { id: 2 }] }));
    act(() => result.current.undo());
    expect(result.current.current).toEqual({ shapes: [{ id: 1 }] });
  });
});
