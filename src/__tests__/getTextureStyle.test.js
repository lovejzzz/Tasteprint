import { describe, it, expect } from "vitest";
import { getTextureStyle } from "../utils";

const palette = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  ac: "#E07A5F",
  ac2: "#F2B880",
  tx: "#3D2C2C",
  mu: "#9C8578",
  bd: "rgba(224,122,95,0.12)",
  su: "#FDF0E8",
};

describe("getTextureStyle", () => {
  it("returns empty object for falsy texture", () => {
    expect(getTextureStyle(null, palette)).toEqual({});
    expect(getTextureStyle(undefined, palette)).toEqual({});
    expect(getTextureStyle("", palette)).toEqual({});
  });

  it("returns empty object for unknown texture", () => {
    expect(getTextureStyle("nonexistent", palette)).toEqual({});
  });

  it("glass: applies backdrop blur and card-based background", () => {
    const s = getTextureStyle("glass", palette);
    expect(s.backdropFilter).toBe("blur(12px)");
    expect(s.WebkitBackdropFilter).toBe("blur(12px)");
    expect(s.background).toBe(palette.card + "CC");
  });

  it("noise: applies SVG noise background image", () => {
    const s = getTextureStyle("noise", palette);
    expect(s.backgroundImage).toContain("feTurbulence");
    expect(s.backgroundRepeat).toBe("repeat");
    expect(s.backgroundSize).toBe("256px 256px");
  });

  it("gradient: applies radial gradients using accent colors", () => {
    const s = getTextureStyle("gradient", palette);
    expect(s.backgroundImage).toContain("radial-gradient");
    expect(s.backgroundImage).toContain(palette.ac);
  });

  it("neumorphic: applies inset/outset box-shadow and removes border", () => {
    const s = getTextureStyle("neumorphic", palette);
    expect(s.boxShadow).toContain("6px 6px 14px");
    expect(s.boxShadow).toContain(palette.tx);
    expect(s.border).toBe("none");
  });

  it("dots: applies dot pattern using border color", () => {
    const s = getTextureStyle("dots", palette);
    expect(s.backgroundImage).toContain("radial-gradient");
    expect(s.backgroundImage).toContain(palette.bd);
    expect(s.backgroundSize).toBe("16px 16px");
  });

  it("grid: applies grid lines using border color", () => {
    const s = getTextureStyle("grid", palette);
    expect(s.backgroundImage).toContain("linear-gradient");
    expect(s.backgroundSize).toBe("20px 20px");
  });

  it("paper: applies paper texture with card background color", () => {
    const s = getTextureStyle("paper", palette);
    expect(s.backgroundImage).toContain("feTurbulence");
    expect(s.backgroundColor).toBe(palette.card);
    expect(s.backgroundRepeat).toBe("repeat");
  });

  it("brushed: applies horizontal repeating lines", () => {
    const s = getTextureStyle("brushed", palette);
    expect(s.backgroundImage).toContain("repeating-linear-gradient");
    expect(s.backgroundImage).toContain("90deg");
  });

  it("marble: applies turbulence displacement SVG", () => {
    const s = getTextureStyle("marble", palette);
    expect(s.backgroundImage).toContain("feDisplacementMap");
    expect(s.backgroundSize).toBe("400px 400px");
  });

  it("frosted: applies heavy backdrop blur with desaturation", () => {
    const s = getTextureStyle("frosted", palette);
    expect(s.backdropFilter).toContain("blur(20px)");
    expect(s.backdropFilter).toContain("saturate(0.8)");
    expect(s.background).toBe(palette.card + "DD");
  });

  it("holographic: applies multi-color gradient with animation", () => {
    const s = getTextureStyle("holographic", palette);
    expect(s.backgroundImage).toContain("linear-gradient");
    expect(s.backgroundImage).toContain("135deg");
    expect(s.backgroundSize).toBe("200% 200%");
    expect(s.animation).toContain("tp-holo");
  });

  it("emboss: applies inset box-shadow for pressed effect", () => {
    const s = getTextureStyle("emboss", palette);
    expect(s.boxShadow).toContain("inset");
    expect(s.boxShadow).toContain(palette.bg);
    expect(s.boxShadow).toContain(palette.tx);
  });

  it("uses ac2 fallback for gradient texture when ac2 is available", () => {
    const s = getTextureStyle("gradient", palette);
    expect(s.backgroundImage).toContain(palette.ac2);
  });

  it("uses ac as fallback when ac2 is missing for gradient texture", () => {
    const noAc2 = { ...palette, ac2: undefined };
    const s = getTextureStyle("gradient", noAc2);
    // Should use ac as fallback via (p.ac2 || p.ac)
    expect(s.backgroundImage).toBeDefined();
  });

  it("holographic uses ac2 fallback for second color when available", () => {
    const s = getTextureStyle("holographic", palette);
    expect(s.backgroundImage).toContain(palette.ac2);
  });

  it("holographic falls back to ac when ac2 is missing", () => {
    const noAc2 = { ...palette, ac2: undefined };
    const s = getTextureStyle("holographic", noAc2);
    // (p.ac2 || p.ac) should produce ac
    expect(s.backgroundImage).toContain(palette.ac);
  });
});
