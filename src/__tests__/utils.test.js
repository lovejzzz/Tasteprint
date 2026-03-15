import { describe, it, expect } from "vitest";
import { uid, maxV, varName, snap, sanitizeHtml, validateImport } from "../utils";

describe("uid", () => {
  it("returns a string of length 9", () => {
    const id = uid();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(9);
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe("maxV", () => {
  it("returns variant count for known types", () => {
    expect(maxV("button")).toBe(7);
    expect(maxV("card")).toBe(8);
  });

  it("returns 1 for unknown types", () => {
    expect(maxV("nonexistent")).toBe(1);
  });
});

describe("varName", () => {
  it("returns variant name for valid index", () => {
    expect(varName("button", 0)).toBe("Filled");
    expect(varName("button", 1)).toBe("Outline");
  });

  it("returns Standard for invalid index", () => {
    expect(varName("button", 99)).toBe("Standard");
    expect(varName("nonexistent", 0)).toBe("Standard");
  });
});

describe("snap", () => {
  it("snaps to center alignment", () => {
    const s = { id: "a", x: 98, y: 50, w: 100, h: 100 };
    const all = [
      { id: "b", x: 100, y: 200, w: 100, h: 100 },
    ];
    const result = snap(s, all);
    expect(result.x).toBe(100);
  });

  it("ignores itself", () => {
    const s = { id: "a", x: 100, y: 50, w: 100, h: 100 };
    const result = snap(s, [s]);
    expect(result.x).toBeNull();
    expect(result.y).toBeNull();
  });

  it("returns null when no snap targets", () => {
    const s = { id: "a", x: 0, y: 0, w: 100, h: 100 };
    const result = snap(s, [{ id: "b", x: 500, y: 500, w: 100, h: 100 }]);
    expect(result.x).toBeNull();
    expect(result.y).toBeNull();
  });
});

describe("sanitizeHtml", () => {
  it("passes through plain text", () => {
    expect(sanitizeHtml("hello world")).toBe("hello world");
  });

  it("passes through non-string values", () => {
    expect(sanitizeHtml(42)).toBe(42);
    expect(sanitizeHtml(null)).toBe(null);
  });

  it("strips script tags", () => {
    const result = sanitizeHtml('<span>ok</span><script>alert("xss")</script>');
    expect(result).not.toContain("script");
    expect(result).toContain("ok");
  });

  it("strips event handlers", () => {
    const result = sanitizeHtml('<span onclick="alert(1)">text</span>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("text");
  });

  it("strips iframe tags", () => {
    const result = sanitizeHtml('<iframe src="evil.com"></iframe>');
    expect(result).not.toContain("iframe");
  });
});

describe("validateImport", () => {
  it("accepts valid data", () => {
    const data = {
      shapes: [{ id: "a", type: "button", x: 0, y: 0, w: 100, h: 44 }],
      pal: "warm",
    };
    const result = validateImport(data);
    expect(result.shapes).toHaveLength(1);
    expect(result.pal).toBe("warm");
  });

  it("rejects null", () => {
    expect(validateImport(null)).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(validateImport("string")).toBeNull();
  });

  it("filters invalid shapes", () => {
    const data = {
      shapes: [
        { id: "a", type: "button", x: 0, y: 0, w: 100, h: 44 },
        { id: "b", type: "card" }, // missing x, y, w, h
        "not a shape",
      ],
    };
    const result = validateImport(data);
    expect(result.shapes).toHaveLength(1);
  });
});
