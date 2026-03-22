import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PAL } from "../constants";

// Mock ComponentRenderer to avoid heavy rendering
vi.mock("../components/ComponentRenderer", () => ({
  default: function MockC({ type, v }) {
    return <div data-testid={`mock-c-${type}-${v}`}>{type} v{v}</div>;
  },
}));

const { default: PickyCard } = await import("../components/PickyCard");

const p = PAL.warm;

const baseOption = {
  variant: 0,
  font: 0,
  fsize: 1,
  props: {},
  dStyles: {},
  mood: "minimal",
};

const baseLibItem = { type: "hero", label: "Hero", w: 400, h: 300 };

describe("PickyCard", () => {
  it("renders without crashing", () => {
    render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={false} onClick={vi.fn()} />);
    // Should render the mocked component
    expect(screen.getByTestId("mock-c-hero-0")).toBeInTheDocument();
  });

  it("shows mood label", () => {
    render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={false} onClick={vi.fn()} />);
    expect(screen.getByText("Minimal")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies selected class when selected", () => {
    const { container } = render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={true} onClick={vi.fn()} />);
    const card = container.querySelector(".tp-picky-card--selected");
    expect(card).not.toBeNull();
  });

  it("shows checkmark when selected", () => {
    const { container } = render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={true} onClick={vi.fn()} />);
    const check = container.querySelector(".tp-picky-card-check");
    expect(check).not.toBeNull();
    expect(check.textContent).toBe("✓");
  });

  it("does not show checkmark when not selected", () => {
    const { container } = render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={false} onClick={vi.fn()} />);
    const check = container.querySelector(".tp-picky-card-check");
    expect(check).toBeNull();
  });

  it("passes correct variant to ComponentRenderer", () => {
    const opt = { ...baseOption, variant: 3 };
    render(<PickyCard option={opt} type="hero" libItem={baseLibItem} p={p} selected={false} onClick={vi.fn()} />);
    expect(screen.getByTestId("mock-c-hero-3")).toBeInTheDocument();
  });

  it("renders variant name", () => {
    // variant 0 of hero = "Gradient" (from VARIANTS)
    render(<PickyCard option={baseOption} type="hero" libItem={baseLibItem} p={p} selected={false} onClick={vi.fn()} />);
    expect(screen.getByText("Gradient")).toBeInTheDocument();
  });

  it("scales preview to fit container width", () => {
    const wideLib = { type: "hero", label: "Hero", w: 800, h: 300 };
    const { container } = render(<PickyCard option={baseOption} type="hero" libItem={wideLib} p={p} selected={false} onClick={vi.fn()} />);
    // The inner div should have a scale transform
    const scaleDiv = container.querySelector("[style*='scale']");
    expect(scaleDiv).not.toBeNull();
  });
});
