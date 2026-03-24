import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import C from "../components/ComponentRenderer";
import { PAL, VARIANTS, DEFAULT_PROPS } from "../constants";

/**
 * Smoke tests for ComponentRenderer — the ~2200-line module that renders all 40+
 * component types across 7+ variants each. These tests verify that every type × variant
 * combination renders without throwing, catching silent crash regressions when variants
 * or props are added/changed.
 *
 * Each test renders with the component's DEFAULT_PROPS (if any) and the warm palette,
 * which mirrors the most common real-world render path.
 */

const p = PAL.warm;

const baseProps = {
  editable: false,
  texts: {},
  onText: undefined,
  onProp: undefined,
  font: 0,
  fsize: 1,
};

describe("ComponentRenderer smoke tests", () => {
  const types = Object.keys(VARIANTS);

  // Sanity: we have component types to test
  it("has component types to test", () => {
    expect(types.length).toBeGreaterThan(30);
  });

  for (const type of types) {
    const variants = VARIANTS[type];
    const defaults = DEFAULT_PROPS[type] || {};

    describe(type, () => {
      for (let v = 0; v < variants.length; v++) {
        it(`renders variant ${v} (${variants[v]}) without crashing`, () => {
          const { container } = render(
            <C type={type} v={v} p={p} props={defaults} {...baseProps} />
          );
          // Must produce at least one DOM element
          expect(container.firstChild).toBeTruthy();
        });
      }
    });
  }

  // Edge case: unknown type should not crash
  it("renders unknown type without crashing", () => {
    const { container } = render(
      <C type="nonexistent-widget" v={0} p={p} props={{}} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  // Edge case: variant index out of range (should still render, falls to default)
  it("renders out-of-range variant without crashing", () => {
    const { container } = render(
      <C type="button" v={999} p={p} props={DEFAULT_PROPS.button || {}} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  // Editable mode should not crash
  it("renders in editable mode without crashing", () => {
    const { container } = render(
      <C type="card" v={0} p={p} props={DEFAULT_PROPS.card || {}} {...baseProps} editable={true} onText={() => {}} onProp={() => {}} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  // Dark palette should not crash (tests luminance calculations)
  it("renders with dark palette (noir) without crashing", () => {
    const { container } = render(
      <C type="hero" v={0} p={PAL.noir} props={DEFAULT_PROPS.hero || {}} {...baseProps} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  // Custom font and fsize
  it("renders with non-default font and fsize", () => {
    const { container } = render(
      <C type="heading" v={0} p={p} props={DEFAULT_PROPS.heading || {}} {...baseProps} font={5} fsize={1.5} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
