import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PAL, FONTS, LIB, VARIANTS } from "../constants";

// Mock ComponentRenderer to avoid rendering all 40+ heavy component types
vi.mock("../components/ComponentRenderer", () => ({
  default: function MockC({ type, v }) {
    return <div data-testid={`mock-c-${type}`}>C:{type}:v{v}</div>;
  },
}));

const { default: ShapeItem } = await import("../components/ShapeItem");

const p = PAL.warm;

// Pick a type that has variants and text
const testType = "hero";
const testShape = {
  id: "s1", type: testType, x: 100, y: 50, w: 400, h: 200,
  variant: 0, font: 0, fsize: 1, texts: {}, props: {}, dStyles: {},
};

function makeProps(overrides = {}) {
  return {
    s: testShape,
    sel: null,
    selAll: new Set(),
    drag: null,
    device: "desktop",
    selFont: null,
    p,
    onDown: vi.fn(),
    onSelect: vi.fn(),
    onText: vi.fn(),
    onProp: vi.fn(),
    cycle: vi.fn(),
    cycleFont: vi.fn(),
    cycleFsize: vi.fn(),
    randomize: vi.fn(),
    styleSource: null,
    setStyleSource: vi.fn(),
    copyStyle: vi.fn(),
    delShape: vi.fn(),
    setRsz: vi.fn(),
    reducedMotion: false,
    ...overrides,
  };
}

describe("ShapeItem", () => {
  it("renders without crashing", () => {
    const { container } = render(<ShapeItem {...makeProps()} />);
    expect(container.querySelector("[data-shape]")).toBeInTheDocument();
  });

  it("renders the component via ComponentRenderer", () => {
    render(<ShapeItem {...makeProps()} />);
    expect(screen.getByTestId(`mock-c-${testType}`)).toBeInTheDocument();
  });

  it("shows toolbar when selected as primary", () => {
    render(<ShapeItem {...makeProps({ sel: "s1", selAll: new Set(["s1"]) })} />);
    // Variant navigation should be visible
    expect(screen.getByLabelText("Next variant")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous variant")).toBeInTheDocument();
  });

  it("hides toolbar when not selected", () => {
    render(<ShapeItem {...makeProps()} />);
    expect(screen.queryByLabelText("Next variant")).not.toBeInTheDocument();
  });

  it("calls cycle on variant button click", () => {
    const cycle = vi.fn();
    render(<ShapeItem {...makeProps({ sel: "s1", selAll: new Set(["s1"]), cycle })} />);
    fireEvent.pointerDown(screen.getByLabelText("Next variant"));
    expect(cycle).toHaveBeenCalledWith("s1", 1);
  });

  it("calls randomize on dice button click", () => {
    const randomize = vi.fn();
    render(<ShapeItem {...makeProps({ sel: "s1", selAll: new Set(["s1"]), randomize })} />);
    fireEvent.pointerDown(screen.getByLabelText("Randomize design"));
    expect(randomize).toHaveBeenCalledWith("s1");
  });

  it("shows delete button when primary selected", () => {
    render(<ShapeItem {...makeProps({ sel: "s1", selAll: new Set(["s1"]) })} />);
    expect(screen.getByLabelText("Delete component")).toBeInTheDocument();
  });

  it("calls delShape on delete click", () => {
    const delShape = vi.fn();
    render(<ShapeItem {...makeProps({ sel: "s1", selAll: new Set(["s1"]), delShape })} />);
    fireEvent.pointerDown(screen.getByLabelText("Delete component"));
    expect(delShape).toHaveBeenCalledWith("s1");
  });

  it("shows Apply Style button when style source is active on another shape", () => {
    render(<ShapeItem {...makeProps({ styleSource: "other-shape" })} />);
    expect(screen.getByLabelText("Apply style from source")).toBeInTheDocument();
  });

  it("shows Style Source badge when shape is the style source but not primary", () => {
    render(<ShapeItem {...makeProps({ styleSource: "s1" })} />);
    expect(screen.getByText("Style Source")).toBeInTheDocument();
  });

  it("strips inline animation when reducedMotion is true", () => {
    const animShape = { ...testShape, dStyles: { animation: "tp-d-breathe 3s ease infinite" } };
    const { container } = render(<ShapeItem {...makeProps({ s: animShape, reducedMotion: true })} />);
    // The component body div should have animation: none
    const bodyDiv = container.querySelector("[data-shape] > div:not([class])") || container.querySelector("[data-shape] > div");
    expect(bodyDiv.style.animation).toBe("none");
  });

  it("preserves inline animation when reducedMotion is false", () => {
    const animShape = { ...testShape, dStyles: { animation: "tp-d-breathe 3s ease infinite" } };
    const { container } = render(<ShapeItem {...makeProps({ s: animShape, reducedMotion: false })} />);
    const bodyDiv = container.querySelector("[data-shape] > div:not([class])") || container.querySelector("[data-shape] > div");
    expect(bodyDiv.style.animation).toBe("tp-d-breathe 3s ease infinite");
  });

  it("strips picky entrance animation when reducedMotion is true", () => {
    const pickyShape = { ...testShape, _pickyDelay: 120 };
    const { container } = render(<ShapeItem {...makeProps({ s: pickyShape, reducedMotion: true })} />);
    const wrapper = container.querySelector("[data-shape]");
    expect(wrapper.className || "").not.toContain("tp-picky-shape-enter");
  });
});
