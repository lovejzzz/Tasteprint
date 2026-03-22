import { describe, it, expect } from "vitest";
import { designScore } from "../utils";

const lightPal = { bg: "#FFFFFF", ac: "#E07A5F", ac2: "#F2B880", tx: "#3D2C2C", mu: "#9C8578", bd: "rgba(224,122,95,0.12)", su: "#FDF0E8" };
const darkPal = { bg: "#1A1A1E", ac: "#FFFFFF", ac2: "#888890", tx: "#F0F0F2", mu: "#78787E", bd: "rgba(255,255,255,0.08)", su: "#2A2A2E" };

describe("designScore", () => {
  it("returns a number between 1 and 5", () => {
    const shape = { type: "button", variant: 0, font: 1, fsize: 1.0 };
    const score = designScore(shape, lightPal);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(5);
  });

  it("baseline score is 3 for neutral inputs", () => {
    // Body font on a medium component, neutral variant, normal fsize
    const shape = { type: "card", variant: 0, font: 1, fsize: 1.0 };
    const score = designScore(shape, lightPal);
    expect(score).toBeGreaterThanOrEqual(3);
  });

  it("rewards display/serif fonts on large components", () => {
    // hero with display font (index 0 = DM Sans in display cat)
    const displayShape = { type: "hero", variant: 0, font: 0, fsize: 1.2 };
    const bodyShape = { type: "hero", variant: 0, font: 1, fsize: 1.2 };
    const displayScore = designScore(displayShape, lightPal);
    const bodyScore = designScore(bodyShape, lightPal);
    expect(displayScore).toBeGreaterThanOrEqual(bodyScore);
  });

  it("penalizes mono fonts on large components", () => {
    // hero with mono font (index 11 = JetBrains Mono)
    const monoShape = { type: "hero", variant: 0, font: 11, fsize: 1.2 };
    const normalShape = { type: "hero", variant: 0, font: 1, fsize: 1.2 };
    const monoScore = designScore(monoShape, lightPal);
    const normalScore = designScore(normalShape, lightPal);
    expect(monoScore).toBeLessThanOrEqual(normalScore);
  });

  it("rewards mono fonts on code-block components", () => {
    const monoShape = { type: "code-block", variant: 0, font: 11, fsize: 1.0 };
    const bodyShape = { type: "code-block", variant: 0, font: 1, fsize: 1.0 };
    const monoScore = designScore(monoShape, lightPal);
    const bodyScore = designScore(bodyShape, lightPal);
    expect(monoScore).toBeGreaterThan(bodyScore);
  });

  it("penalizes extreme font sizes on large components", () => {
    const tinyFsize = { type: "hero", variant: 0, font: 0, fsize: 0.6 };
    const normalFsize = { type: "hero", variant: 0, font: 0, fsize: 1.2 };
    expect(designScore(normalFsize, lightPal)).toBeGreaterThan(designScore(tinyFsize, lightPal));
  });

  it("considers cross-component font consistency", () => {
    // Canvas full of body fonts — a body font shape should score higher
    const others = [
      { type: "card", variant: 0, font: 1, fsize: 1.0 },
      { type: "button", variant: 0, font: 2, fsize: 1.0 },
      { type: "input", variant: 0, font: 3, fsize: 1.0 },
    ];
    const bodyShape = { type: "navbar", variant: 0, font: 1, fsize: 1.0 };
    const serifShape = { type: "navbar", variant: 0, font: 9, fsize: 1.0 };
    const bodyScore = designScore(bodyShape, lightPal, others);
    const serifScore = designScore(serifShape, lightPal, others);
    expect(bodyScore).toBeGreaterThanOrEqual(serifScore);
  });

  it("penalizes text gradient + text shadow conflict", () => {
    const conflicted = {
      type: "card", variant: 0, font: 1, fsize: 1.0,
      dStyles: { WebkitTextFillColor: "transparent", textShadow: "1px 1px 0 #000" },
    };
    const clean = {
      type: "card", variant: 0, font: 1, fsize: 1.0,
      dStyles: {},
    };
    expect(designScore(conflicted, lightPal)).toBeLessThanOrEqual(designScore(clean, lightPal));
  });

  it("rewards glass variant on dark palettes", () => {
    // button has 7 variants; glass is at index varCount-3 = 4
    const glassShape = { type: "button", variant: 4, font: 1, fsize: 1.0 };
    const standardShape = { type: "button", variant: 0, font: 1, fsize: 1.0 };
    const glassScore = designScore(glassShape, darkPal);
    const standardScore = designScore(standardShape, darkPal);
    expect(glassScore).toBeGreaterThanOrEqual(standardScore);
  });

  it("clamps score to [1, 5] range", () => {
    // Worst case: mono font, huge fsize, on a large component
    const worst = { type: "hero", variant: 0, font: 11, fsize: 2.0 };
    expect(designScore(worst, lightPal)).toBeGreaterThanOrEqual(1);

    // Best case: display font, good fsize, glass on dark
    const best = { type: "hero", variant: 4, font: 0, fsize: 1.2 };
    expect(designScore(best, darkPal)).toBeLessThanOrEqual(5);
  });
});
