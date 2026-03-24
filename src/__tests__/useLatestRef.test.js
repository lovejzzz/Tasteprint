import { renderHook } from "@testing-library/react";
import { useLatestRef } from "../hooks/useLatestRef";

describe("useLatestRef", () => {
  it("returns a ref with the initial value", () => {
    const { result } = renderHook(() => useLatestRef(42));
    expect(result.current.current).toBe(42);
  });

  it("updates ref.current when value changes", () => {
    let val = "a";
    const { result, rerender } = renderHook(() => useLatestRef(val));
    expect(result.current.current).toBe("a");
    val = "b";
    rerender();
    expect(result.current.current).toBe("b");
  });

  it("returns a stable ref object across re-renders", () => {
    let val = 1;
    const { result, rerender } = renderHook(() => useLatestRef(val));
    const first = result.current;
    val = 2;
    rerender();
    expect(result.current).toBe(first);
  });

  it("works with objects", () => {
    const obj = { x: 1, y: 2 };
    const { result } = renderHook(() => useLatestRef(obj));
    expect(result.current.current).toBe(obj);
    const obj2 = { x: 3 };
    const { result: r2 } = renderHook(() => useLatestRef(obj2));
    expect(r2.current.current).toBe(obj2);
  });
});
