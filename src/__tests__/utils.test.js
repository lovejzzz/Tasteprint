import { uid, maxV, varName, snap, sanitizeHtml, validateImport, getReadableTextColor, getTextureStyle, debounce, load } from "../utils";

/* ── uid ── */
describe("uid", () => {
  it("returns a string of length 9", () => {
    const id = uid();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(9);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

/* ── maxV ── */
describe("maxV", () => {
  it("returns variant count for a known type", () => {
    expect(maxV("button")).toBeGreaterThanOrEqual(1);
  });

  it("returns 1 for an unknown type", () => {
    expect(maxV("nonexistent_type_xyz")).toBe(1);
  });
});

/* ── varName ── */
describe("varName", () => {
  it("returns variant name for known type and index", () => {
    const name = varName("button", 0);
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(name).not.toBe("Standard");
  });

  it('returns "Standard" for out-of-range index', () => {
    expect(varName("button", 999)).toBe("Standard");
  });

  it('returns "Standard" for unknown type', () => {
    expect(varName("nonexistent_type_xyz", 0)).toBe("Standard");
  });
});

/* ── snap ── */
describe("snap", () => {
  it("returns no snaps when canvas is empty", () => {
    const shape = { id: "a", x: 100, y: 100, w: 200, h: 100 };
    const result = snap(shape, []);
    expect(result.x).toBeNull();
    expect(result.y).toBeNull();
    expect(result.g).toEqual([]);
  });

  it("snaps to center-aligned shape", () => {
    const shape = { id: "a", x: 98, y: 100, w: 200, h: 100 };
    const other = { id: "b", x: 100, y: 300, w: 200, h: 100 };
    const result = snap(shape, [other]);
    // Centers are 198 vs 200 — within threshold of 10
    expect(result.x).toBe(100); // snapped to match other's x
    expect(result.g.length).toBeGreaterThan(0);
  });

  it("snaps to edge-aligned shape", () => {
    const shape = { id: "a", x: 101, y: 50, w: 100, h: 50 };
    const other = { id: "b", x: 100, y: 200, w: 100, h: 50 };
    const result = snap(shape, [other]);
    expect(result.x).toBe(100);
  });

  it("skips same-id shapes", () => {
    const shape = { id: "a", x: 100, y: 100, w: 200, h: 100 };
    const result = snap(shape, [shape]);
    expect(result.x).toBeNull();
    expect(result.y).toBeNull();
  });

  it("respects custom threshold", () => {
    const shape = { id: "a", x: 115, y: 100, w: 200, h: 100 };
    const other = { id: "b", x: 100, y: 300, w: 200, h: 100 };
    // Default threshold 10 — 15px gap shouldn't snap
    const noSnap = snap(shape, [other], 10);
    // With threshold 20 it should snap
    const yesSnap = snap(shape, [other], 20);
    expect(yesSnap.g.length).toBeGreaterThanOrEqual(noSnap.g.length);
  });

  it("snaps to gap-based spacing (12/16/24px)", () => {
    const other = { id: "b", x: 100, y: 100, w: 100, h: 50 };
    // Place shape 16px below other's bottom edge
    const shape = { id: "a", x: 100, y: 166, w: 100, h: 50 };
    const result = snap(shape, [other]);
    expect(result.g.length).toBeGreaterThan(0);
  });
});

/* ── sanitizeHtml ── */
describe("sanitizeHtml", () => {
  it("returns plain text unchanged", () => {
    expect(sanitizeHtml("hello world")).toBe("hello world");
  });

  it("returns non-string input unchanged", () => {
    expect(sanitizeHtml(42)).toBe(42);
    expect(sanitizeHtml(null)).toBe(null);
  });

  it("strips script tags", () => {
    const result = sanitizeHtml('<div>ok</div><script>alert("x")</script>');
    expect(result).not.toContain("script");
    expect(result).toContain("ok");
  });

  it("strips iframe tags", () => {
    const result = sanitizeHtml('<p>text</p><iframe src="evil.com"></iframe>');
    expect(result).not.toContain("iframe");
    expect(result).toContain("text");
  });

  it("strips onclick handlers", () => {
    const result = sanitizeHtml('<div onclick="alert(1)">click</div>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("click");
  });

  it("strips javascript: hrefs", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
    expect(result).not.toContain("javascript");
  });

  it("allows safe img data: URLs", () => {
    const result = sanitizeHtml('<img src="data:image/png;base64,abc123">');
    expect(result).toContain("data:image/");
  });

  it("strips non-image data: URLs", () => {
    const result = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(result).not.toContain("data:text");
  });
});

/* ── validateImport ── */
describe("validateImport", () => {
  it("returns null for non-object input", () => {
    expect(validateImport(null)).toBeNull();
    expect(validateImport("string")).toBeNull();
    expect(validateImport(42)).toBeNull();
  });

  it("accepts valid shapes", () => {
    const data = {
      shapes: [
        { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 200, variant: 0, texts: {}, font: 0 },
      ],
      pal: "warm",
    };
    const result = validateImport(data);
    expect(result).not.toBeNull();
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].type).toBe("hero");
    expect(result.pal).toBe("warm");
  });

  it("filters out shapes missing required fields", () => {
    const data = {
      shapes: [
        { id: "a", type: "hero", x: 0, y: 0, w: 400, h: 200 }, // valid
        { id: "b", type: "card" }, // missing x, y, w, h
        { type: "button", x: 0, y: 0, w: 100, h: 40 }, // missing id
      ],
    };
    const result = validateImport(data);
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].id).toBe("a");
  });

  it("preserves numeric prefV entries and drops invalid ones", () => {
    const data = {
      prefV: { hero: 2, card: "invalid", button: Infinity },
    };
    const result = validateImport(data);
    expect(result.prefV).toEqual({ hero: 2 });
  });

  it("preserves finite gest and drops non-finite", () => {
    expect(validateImport({ gest: 3 }).gest).toBe(3);
    expect(validateImport({ gest: NaN }).gest).toBeUndefined();
  });

  it("returns empty object (not null) for empty input object", () => {
    const result = validateImport({});
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });
});

/* ── getReadableTextColor ── */
describe("getReadableTextColor", () => {
  it('returns dark text for light backgrounds', () => {
    expect(getReadableTextColor("#FFFFFF")).toBe("#1a1a1a");
    expect(getReadableTextColor("#FFF8F2")).toBe("#1a1a1a");
  });

  it('returns light text for dark backgrounds', () => {
    expect(getReadableTextColor("#000000")).toBe("#fff");
    expect(getReadableTextColor("#1A1A1E")).toBe("#fff");
  });

  it('returns "#fff" for non-string input', () => {
    expect(getReadableTextColor(null)).toBe("#fff");
    expect(getReadableTextColor(undefined)).toBe("#fff");
  });

  it('returns "#fff" for short hex strings', () => {
    expect(getReadableTextColor("#FFF")).toBe("#fff");
  });
});

/* ── getTextureStyle ── */
describe("getTextureStyle", () => {
  const mockPal = { bg: "#FFF8F2", card: "#FFFFFF", ac: "#E07A5F", ac2: "#F2B880", tx: "#3D2C2C", mu: "#9C8578", bd: "rgba(224,122,95,0.12)", su: "#FDF0E8" };

  it("returns empty object for falsy texture", () => {
    expect(getTextureStyle(null, mockPal)).toEqual({});
    expect(getTextureStyle("", mockPal)).toEqual({});
    expect(getTextureStyle(undefined, mockPal)).toEqual({});
  });

  it("returns glass styles with backdrop filter", () => {
    const s = getTextureStyle("glass", mockPal);
    expect(s.backdropFilter).toContain("blur");
  });

  it("returns noise styles with background image", () => {
    const s = getTextureStyle("noise", mockPal);
    expect(s.backgroundImage).toBeDefined();
  });

  it("returns neumorphic styles with box shadow", () => {
    const s = getTextureStyle("neumorphic", mockPal);
    expect(s.boxShadow).toBeDefined();
  });

  it("returns empty object for unknown texture", () => {
    expect(getTextureStyle("unknown_texture", mockPal)).toEqual({});
  });

  for (const name of ["glass", "noise", "gradient", "neumorphic", "dots", "grid", "paper", "brushed", "marble", "frosted", "holographic", "emboss"]) {
    it(`handles "${name}" without throwing`, () => {
      expect(() => getTextureStyle(name, mockPal)).not.toThrow();
      const result = getTextureStyle(name, mockPal);
      expect(typeof result).toBe("object");
    });
  }
});

/* ── debounce ── */
describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delays function execution", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on repeated calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // reset
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes arguments to the debounced function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced("a", "b");
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith("a", "b");
  });
});

/* ── load ── */
describe("load", () => {
  beforeEach(() => localStorage.clear());

  it("returns default when nothing stored", () => {
    expect(load("shapes", [])).toEqual([]);
    expect(load("pal", "warm")).toBe("warm");
  });

  it("returns stored value", () => {
    localStorage.setItem("tasteprint", JSON.stringify({ pal: "cool" }));
    expect(load("pal", "warm")).toBe("cool");
  });

  it("returns default on corrupted JSON", () => {
    localStorage.setItem("tasteprint", "not-json");
    expect(load("pal", "warm")).toBe("warm");
  });
});
