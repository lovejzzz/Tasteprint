import { describe, it, expect } from "vitest";
import { validateImport } from "../utils";

describe("validateImport", () => {
  it("returns null for non-object input", () => {
    expect(validateImport(null)).toBeNull();
    expect(validateImport(undefined)).toBeNull();
    expect(validateImport("string")).toBeNull();
    expect(validateImport(42)).toBeNull();
  });

  it("returns empty object for empty input", () => {
    expect(validateImport({})).toEqual({});
  });

  it("validates shapes with required fields", () => {
    const valid = { id: "a1", type: "button", x: 0, y: 0, w: 100, h: 40 };
    const result = validateImport({ shapes: [valid] });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe("a1");
    expect(result.shapes[0].type).toBe("button");
  });

  it("filters out shapes missing required fields", () => {
    const incomplete = { id: "b1", type: "card" }; // missing x, y, w, h
    const valid = { id: "b2", type: "hero", x: 10, y: 20, w: 480, h: 210 };
    const result = validateImport({ shapes: [incomplete, valid] });
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe("b2");
  });

  it("preserves palette string", () => {
    const result = validateImport({ pal: "cool" });
    expect(result.pal).toBe("cool");
  });

  it("ignores non-string palette", () => {
    const result = validateImport({ pal: 42 });
    expect(result.pal).toBeUndefined();
  });

  it("validates prefV (only finite numbers)", () => {
    const result = validateImport({ prefV: { button: 2, card: NaN, hero: Infinity, tabs: "bad" } });
    expect(result.prefV).toEqual({ button: 2 });
  });

  it("ignores array prefV", () => {
    const result = validateImport({ prefV: [1, 2, 3] });
    expect(result.prefV).toBeUndefined();
  });

  it("validates finite gest", () => {
    expect(validateImport({ gest: 3 }).gest).toBe(3);
    expect(validateImport({ gest: NaN }).gest).toBeUndefined();
    expect(validateImport({ gest: Infinity }).gest).toBeUndefined();
    expect(validateImport({ gest: "0" }).gest).toBeUndefined();
  });

  it("sanitizes HTML in shape string fields", () => {
    const shape = { id: "c1", type: "card", x: 0, y: 0, w: 100, h: 100, label: '<script>alert(1)</script>Hi' };
    const result = validateImport({ shapes: [shape] });
    expect(result.shapes[0].label).not.toContain("<script>");
    expect(result.shapes[0].label).toContain("Hi");
  });

  it("sanitizes HTML in nested props strings", () => {
    const shape = { id: "d1", type: "card", x: 0, y: 0, w: 100, h: 100, props: { title: '<iframe src="evil"></iframe>Clean' } };
    const result = validateImport({ shapes: [shape] });
    expect(result.shapes[0].props.title).not.toContain("<iframe");
    expect(result.shapes[0].props.title).toContain("Clean");
  });

  it("preserves non-string props values", () => {
    const shape = { id: "e1", type: "button", x: 0, y: 0, w: 100, h: 40, props: { loading: false, count: 5 } };
    const result = validateImport({ shapes: [shape] });
    expect(result.shapes[0].props.loading).toBe(false);
    expect(result.shapes[0].props.count).toBe(5);
  });

  it("does not modify id or type strings (no sanitization)", () => {
    const shape = { id: "f1", type: "button", x: 0, y: 0, w: 100, h: 40 };
    const result = validateImport({ shapes: [shape] });
    expect(result.shapes[0].id).toBe("f1");
    expect(result.shapes[0].type).toBe("button");
  });

  it("handles full round-trip data", () => {
    const data = {
      shapes: [
        { id: "g1", type: "hero", x: 10, y: 20, w: 480, h: 210, variant: 2, font: 1, fsize: 1.2, texts: { title: "Hello" }, props: { showCta: true } },
        { id: "g2", type: "button", x: 100, y: 300, w: 148, h: 44, variant: 0 },
      ],
      pal: "noir",
      prefV: { hero: 2, button: 0 },
      gest: 1,
    };
    const result = validateImport(data);
    expect(result.shapes).toHaveLength(2);
    expect(result.pal).toBe("noir");
    expect(result.prefV).toEqual({ hero: 2, button: 0 });
    expect(result.gest).toBe(1);
  });
});
