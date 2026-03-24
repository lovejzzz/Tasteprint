import { describe, it, expect } from "vitest";
import { assembleShapes, paletteTemperature, PAGE_TEMPLATES, PICKY_MOODS, QUICK_PRESETS, CUSTOM_SLOT_OPTIONS, loadPickyHistory, libEntry } from "../hooks/usePicky";
import { PAL } from "../constants";

describe("paletteTemperature", () => {
  it("classifies warm palettes (red/orange accents)", () => {
    expect(paletteTemperature(PAL.warm)).toBe("warm");  // #E07A5F — orange
    expect(paletteTemperature(PAL.candy)).toBe("warm");  // #E8589C — pink/magenta
  });

  it("classifies cool palettes (blue/cyan accents)", () => {
    expect(paletteTemperature(PAL.cool)).toBe("cool");   // #5B8DB8 — blue
    expect(paletteTemperature(PAL.ocean)).toBe("cool");   // #2B7A9E — teal-blue
    expect(paletteTemperature(PAL.lavender)).toBe("cool"); // #7C5CBF — purple
  });

  it("classifies achromatic palettes as neutral", () => {
    expect(paletteTemperature(PAL.noir)).toBe("neutral");  // #FFFFFF — achromatic
    expect(paletteTemperature(PAL.mono)).toBe("neutral");  // #555555 — achromatic
  });

  it("handles missing accent gracefully", () => {
    expect(paletteTemperature({})).toBe("neutral");
    expect(paletteTemperature({ ac: "#888888" })).toBe("neutral");
  });
});

describe("PAGE_TEMPLATES", () => {
  it("has at least 5 templates", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("every template has id, label, icon, and at least 2 slots", () => {
    for (const tmpl of PAGE_TEMPLATES) {
      expect(typeof tmpl.id).toBe("string");
      expect(typeof tmpl.label).toBe("string");
      expect(typeof tmpl.icon).toBe("string");
      expect(tmpl.slots.length).toBeGreaterThanOrEqual(2);
      for (const slot of tmpl.slots) {
        expect(typeof slot.type).toBe("string");
        expect(typeof slot.label).toBe("string");
      }
    }
  });

  it("has unique template IDs", () => {
    const ids = PAGE_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("PICKY_MOODS", () => {
  it("has at least 4 moods", () => {
    expect(PICKY_MOODS.length).toBeGreaterThanOrEqual(4);
  });

  it("each mood has id, label, and desc", () => {
    for (const m of PICKY_MOODS) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.label).toBe("string");
      expect(typeof m.desc).toBe("string");
    }
  });
});

describe("QUICK_PRESETS", () => {
  it("each preset references a valid template", () => {
    const ids = new Set(PAGE_TEMPLATES.map(t => t.id));
    for (const p of QUICK_PRESETS) {
      expect(ids.has(p.template)).toBe(true);
    }
  });

  it("each preset has a label", () => {
    for (const p of QUICK_PRESETS) {
      expect(typeof p.label).toBe("string");
    }
  });
});

describe("CUSTOM_SLOT_OPTIONS", () => {
  it("each option has type and label", () => {
    for (const o of CUSTOM_SLOT_OPTIONS) {
      expect(typeof o.type).toBe("string");
      expect(typeof o.label).toBe("string");
    }
  });

  it("has no duplicate types", () => {
    const types = CUSTOM_SLOT_OPTIONS.map(o => o.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe("libEntry", () => {
  it("returns a known LIB item for a valid type", () => {
    const entry = libEntry("hero");
    expect(entry.type).toBe("hero");
    expect(typeof entry.w).toBe("number");
    expect(typeof entry.h).toBe("number");
    expect(typeof entry.label).toBe("string");
  });

  it("returns fallback with label for an unknown type", () => {
    const entry = libEntry("nonexistent-widget");
    expect(entry.type).toBe("nonexistent-widget");
    expect(entry.label).toBe("nonexistent-widget");
    expect(entry.w).toBe(300);
    expect(entry.h).toBe(200);
  });
});

describe("assembleShapes", () => {
  const landing = PAGE_TEMPLATES.find(t => t.id === "landing");

  it("returns empty array when no picks", () => {
    const result = assembleShapes(landing, new Map(), "desktop", false);
    expect(result).toEqual([]);
  });

  it("returns positioned shapes for each picked slot", () => {
    const picks = new Map();
    // Mock picks for first 3 slots
    picks.set(0, { variant: 1, font: 0, fsize: 1, props: {}, dStyles: {} });
    picks.set(1, { variant: 0, font: 2, fsize: 1, props: {}, dStyles: {} });
    picks.set(2, { variant: 2, font: 1, fsize: 1.2, props: {}, dStyles: {} });

    const shapes = assembleShapes(landing, picks, "desktop", false);
    expect(shapes).toHaveLength(3);

    // Each shape should have required fields
    for (const s of shapes) {
      expect(typeof s.id).toBe("string");
      expect(typeof s.type).toBe("string");
      expect(typeof s.x).toBe("number");
      expect(typeof s.y).toBe("number");
      expect(typeof s.w).toBe("number");
      expect(typeof s.h).toBe("number");
      expect(typeof s.variant).toBe("number");
      expect(s._pickyDelay).toBeDefined();
    }

    // Shapes should be stacked vertically (each y > previous y)
    expect(shapes[1].y).toBeGreaterThan(shapes[0].y);
    expect(shapes[2].y).toBeGreaterThan(shapes[1].y);
  });

  it("respects phone layout (narrower canvas)", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });

    const desktop = assembleShapes(landing, picks, "desktop", false);
    const phone = assembleShapes(landing, picks, "phone", false);

    // Phone shapes should be narrower or equal
    expect(phone[0].w).toBeLessThanOrEqual(desktop[0].w);
  });

  it("preserves variant from pick", () => {
    const picks = new Map();
    picks.set(0, { variant: 3, font: 1, fsize: 1.5, props: { dark: true }, dStyles: {} });

    const shapes = assembleShapes(landing, picks, "desktop", false);
    expect(shapes[0].variant).toBe(3);
    expect(shapes[0].font).toBe(1);
    expect(shapes[0].fsize).toBe(1.5);
    expect(shapes[0].props.dark).toBe(true);
  });

  it("skips unpicked slots", () => {
    const picks = new Map();
    // Pick slot 0 and 2, skip 1
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    picks.set(2, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });

    const shapes = assembleShapes(landing, picks, "desktop", false);
    expect(shapes).toHaveLength(2);
  });

  it("assigns sequential _pickyDelay for entrance animation", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    picks.set(1, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    picks.set(2, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });

    const shapes = assembleShapes(landing, picks, "desktop", false);
    expect(shapes[0]._pickyDelay).toBe(0);
    expect(shapes[1]._pickyDelay).toBe(120);
    expect(shapes[2]._pickyDelay).toBe(240);
  });
});

describe("loadPickyHistory", () => {
  it("returns empty array when no history", () => {
    localStorage.clear();
    expect(loadPickyHistory()).toEqual([]);
  });

  it("returns stored history", () => {
    const hist = [{ templateId: "landing", templateLabel: "Landing Page", mood: "bold", timestamp: 123 }];
    localStorage.setItem("tp_picky_history", JSON.stringify(hist));
    expect(loadPickyHistory()).toEqual(hist);
  });

  it("handles corrupt storage gracefully", () => {
    localStorage.setItem("tp_picky_history", "not-json");
    expect(loadPickyHistory()).toEqual([]);
  });

  it("limits to 3 entries", () => {
    const hist = Array.from({ length: 5 }, (_, i) => ({ templateId: `t${i}`, templateLabel: `T${i}`, mood: "bold", timestamp: i }));
    localStorage.setItem("tp_picky_history", JSON.stringify(hist));
    expect(loadPickyHistory()).toHaveLength(3);
  });
});
