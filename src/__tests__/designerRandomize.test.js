import { describe, it, expect } from "vitest";
import { designerRandomize, generateDesignDNA, DESIGN_MOODS } from "../utils";

const lightPal = { bg: "#FFFFFF", ac: "#E07A5F", ac2: "#F2B880", tx: "#3D2C2C", mu: "#9C8578", bd: "rgba(224,122,95,0.12)", su: "#FDF0E8" };
const darkPal = { bg: "#1A1A1E", ac: "#FFFFFF", ac2: "#888890", tx: "#F0F0F2", mu: "#78787E", bd: "rgba(255,255,255,0.08)", su: "#2A2A2E" };
const defaults = { loading: false, disabled: false, icon: false, showLabel: true, animated: true };

describe("designerRandomize", () => {
  it("returns an object with variant, font, fsize, props, dStyles", () => {
    const result = designerRandomize("button", lightPal, defaults);
    expect(result).toHaveProperty("variant");
    expect(result).toHaveProperty("font");
    expect(result).toHaveProperty("fsize");
    expect(result).toHaveProperty("props");
    expect(result).toHaveProperty("dStyles");
  });

  it("variant is a non-negative integer within range", () => {
    for (let i = 0; i < 20; i++) {
      const { variant } = designerRandomize("button", lightPal, defaults);
      expect(variant).toBeGreaterThanOrEqual(0);
      expect(variant).toBeLessThan(7); // button has 7 variants
      expect(Number.isInteger(variant)).toBe(true);
    }
  });

  it("font is a non-negative integer", () => {
    const { font } = designerRandomize("card", lightPal, defaults);
    expect(font).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(font)).toBe(true);
  });

  it("fsize is a reasonable positive number", () => {
    for (let i = 0; i < 20; i++) {
      const { fsize } = designerRandomize("hero", lightPal, defaults);
      expect(fsize).toBeGreaterThan(0.5);
      expect(fsize).toBeLessThan(2.0);
    }
  });

  it("props contains keys from defaults", () => {
    const { props } = designerRandomize("button", lightPal, defaults);
    // Should have randomized versions of the default keys
    for (const key of Object.keys(defaults)) {
      expect(props).toHaveProperty(key);
    }
  });

  it("dStyles is an object", () => {
    const { dStyles } = designerRandomize("card", lightPal, defaults);
    expect(typeof dStyles).toBe("object");
    expect(dStyles).not.toBeNull();
  });

  it("works with all standard moods", () => {
    const moods = ["auto", "minimal", "bold", "elegant", "playful"];
    for (const mood of moods) {
      const result = designerRandomize("card", lightPal, defaults, mood);
      expect(result).toHaveProperty("variant");
      expect(result).toHaveProperty("font");
      expect(result).toHaveProperty("fsize");
    }
  });

  it("works with dark palettes", () => {
    const result = designerRandomize("hero", darkPal, defaults, "bold");
    expect(result).toHaveProperty("variant");
    expect(typeof result.fsize).toBe("number");
  });

  it("works with DNA for canvas cohesion", () => {
    const dna = generateDesignDNA(lightPal, "elegant");
    const result = designerRandomize("card", lightPal, defaults, "elegant", [], dna);
    expect(result).toHaveProperty("variant");
    expect(result).toHaveProperty("dStyles");
  });

  it("works with otherShapes for harmony", () => {
    const others = [
      { type: "card", variant: 0, font: 1, fsize: 1.0, dStyles: { borderRadius: 12, boxShadow: "0 2px 8px #00000010" } },
      { type: "button", variant: 1, font: 2, fsize: 0.95, dStyles: { borderRadius: 8 } },
    ];
    const result = designerRandomize("hero", lightPal, defaults, "auto", others);
    expect(result).toHaveProperty("variant");
    expect(result).toHaveProperty("dStyles");
  });

  it("works with null/undefined defaults", () => {
    const result = designerRandomize("button", lightPal, null);
    expect(result).toHaveProperty("variant");
    expect(result.props).toEqual({});
  });

  it("works with unknown component type", () => {
    const result = designerRandomize("nonexistent", lightPal, defaults);
    expect(result).toHaveProperty("variant");
    expect(result.variant).toBe(0); // single variant → 0
  });

  it("works with shapeW and shapeH for aspect-aware styling", () => {
    // Wide banner
    const wide = designerRandomize("hero", lightPal, defaults, "auto", [], null, 600, 100);
    expect(wide).toHaveProperty("dStyles");
    // Tall column
    const tall = designerRandomize("sidebar", lightPal, defaults, "auto", [], null, 100, 400);
    expect(tall).toHaveProperty("dStyles");
  });

  it("all DESIGN_MOODS have valid ids", () => {
    expect(DESIGN_MOODS.length).toBeGreaterThan(5);
    for (const mood of DESIGN_MOODS) {
      expect(mood).toHaveProperty("id");
      expect(mood).toHaveProperty("label");
      expect(mood).toHaveProperty("icon");
      expect(typeof mood.id).toBe("string");
    }
  });

  it("extended moods produce valid results", () => {
    const extendedMoods = ["artdeco", "synthwave", "pixel", "lineart", "kawaii", "scifi"];
    for (const mood of extendedMoods) {
      const result = designerRandomize("card", lightPal, defaults, mood);
      expect(result).toHaveProperty("variant");
      expect(result).toHaveProperty("dStyles");
    }
  });
});
