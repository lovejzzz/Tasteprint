import { describe, it, expect } from "vitest";
import { VARIANTS, DEFAULT_PROPS, HAS_PROPS, HAS_TEXT, LIB, FONTS, PAL } from "../constants";
import { SIZE_CAT } from "../utils";

describe("constants integrity", () => {
  it("every LIB item type has VARIANTS defined", () => {
    const libTypes = LIB.flatMap(cat => cat.items.map(i => i.type));
    const missing = libTypes.filter(t => !VARIANTS[t]);
    expect(missing).toEqual([]);
  });

  it("every LIB item type with HAS_PROPS has DEFAULT_PROPS", () => {
    const libTypes = LIB.flatMap(cat => cat.items.map(i => i.type));
    const missing = libTypes.filter(t => HAS_PROPS.has(t) && !DEFAULT_PROPS[t]);
    expect(missing).toEqual([]);
  });

  it("HAS_PROPS matches DEFAULT_PROPS keys exactly", () => {
    const dpKeys = new Set(Object.keys(DEFAULT_PROPS));
    expect(HAS_PROPS).toEqual(dpKeys);
  });

  it("every LIB item has required fields (type, label, w, h)", () => {
    for (const cat of LIB) {
      for (const item of cat.items) {
        expect(item).toHaveProperty("type");
        expect(item).toHaveProperty("label");
        expect(typeof item.w).toBe("number");
        expect(typeof item.h).toBe("number");
        expect(item.w).toBeGreaterThan(0);
        expect(item.h).toBeGreaterThan(0);
      }
    }
  });

  it("every LIB category has a non-empty cat name and items array", () => {
    for (const cat of LIB) {
      expect(typeof cat.cat).toBe("string");
      expect(cat.cat.length).toBeGreaterThan(0);
      expect(Array.isArray(cat.items)).toBe(true);
      expect(cat.items.length).toBeGreaterThan(0);
    }
  });

  it("VARIANTS values are all non-empty arrays of strings", () => {
    for (const [, variants] of Object.entries(VARIANTS)) {
      expect(Array.isArray(variants)).toBe(true);
      expect(variants.length).toBeGreaterThan(0);
      for (const v of variants) {
        expect(typeof v).toBe("string");
      }
    }
  });

  it("FONTS entries have name and family", () => {
    expect(FONTS.length).toBeGreaterThan(0);
    for (const f of FONTS) {
      expect(typeof f.name).toBe("string");
      expect(typeof f.family).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
    }
  });

  it("PAL entries have all required color keys", () => {
    const requiredKeys = ["bg", "card", "ac", "ac2", "tx", "mu", "bd", "su", "name"];
    for (const [, pal] of Object.entries(PAL)) {
      for (const k of requiredKeys) {
        expect(pal).toHaveProperty(k);
        expect(typeof pal[k]).toBe("string");
      }
    }
  });

  it("every HAS_TEXT type exists in VARIANTS", () => {
    const variantTypes = new Set(Object.keys(VARIANTS));
    const missing = [...HAS_TEXT].filter(t => !variantTypes.has(t));
    expect(missing).toEqual([]);
  });

  it("every DEFAULT_PROPS type exists in VARIANTS", () => {
    const variantTypes = new Set(Object.keys(VARIANTS));
    const missing = Object.keys(DEFAULT_PROPS).filter(t => !variantTypes.has(t));
    expect(missing).toEqual([]);
  });

  it("no duplicate types within a single LIB category", () => {
    for (const cat of LIB) {
      const types = cat.items.map(i => i.type);
      const unique = new Set(types);
      expect(types.length).toBe(unique.size);
    }
  });

  it("every VARIANTS type appears in at least one LIB category", () => {
    const libTypes = new Set(LIB.flatMap(cat => cat.items.map(i => i.type)));
    const orphaned = Object.keys(VARIANTS).filter(t => !libTypes.has(t));
    expect(orphaned).toEqual([]);
  });

  it("every DEFAULT_PROPS type appears in at least one LIB category", () => {
    const libTypes = new Set(LIB.flatMap(cat => cat.items.map(i => i.type)));
    const orphaned = Object.keys(DEFAULT_PROPS).filter(t => !libTypes.has(t));
    expect(orphaned).toEqual([]);
  });

  it("every VARIANTS type is covered by exactly one SIZE_CAT category", () => {
    const allCategorized = new Set();
    for (const [, types] of Object.entries(SIZE_CAT)) {
      for (const t of types) {
        expect(allCategorized.has(t)).toBe(false); // no duplicates across categories
        allCategorized.add(t);
      }
    }
    const missing = Object.keys(VARIANTS).filter(t => !allCategorized.has(t));
    expect(missing).toEqual([]);
  });
});
