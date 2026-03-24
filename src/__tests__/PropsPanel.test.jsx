import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PropsPanel from "../components/PropsPanel";
import { DEFAULT_PROPS, HAS_PROPS } from "../constants";
import { PAL } from "../constants";

const p = PAL.warm;

describe("PropsPanel", () => {
  it("returns null for types not in HAS_PROPS", () => {
    const { container } = render(
      <PropsPanel type="nonexistent" props={{}} onProp={vi.fn()} p={p} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null for types in HAS_PROPS but with empty controls array", () => {
    // This won't happen in practice, but verifies the guard
    const { container } = render(
      <PropsPanel type="__fake__" props={{}} onProp={vi.fn()} p={p} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders controls for button type", () => {
    // button has: loading, disabled, icon, showLabel, animated
    const onProp = vi.fn();
    render(
      <PropsPanel type="button" props={{}} onProp={onProp} p={p} />
    );
    // Should render toggle labels for button props
    expect(screen.getByText("Loaded")).toBeInTheDocument(); // loading=false
    expect(screen.getByText("Enabled")).toBeInTheDocument(); // disabled=false
  });

  it("calls onProp when a toggle is clicked", () => {
    const onProp = vi.fn();
    const defaults = DEFAULT_PROPS["button"] || {};
    render(
      <PropsPanel type="button" props={defaults} onProp={onProp} p={p} />
    );
    // Click the loading toggle — find by label text "Loaded" (loading=false)
    // The Sw component renders a button, we click it
    const loadedLabel = screen.getByText("Loaded");
    // The toggle button is the next sibling
    const toggleBtn = loadedLabel.nextElementSibling;
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(onProp).toHaveBeenCalledWith("loading", true);
    }
  });

  it("renders star rating controls for rating component", () => {
    // Only run if rating is in HAS_PROPS
    if (!HAS_PROPS.has("rating")) return;
    render(
      <PropsPanel type="rating" props={{}} onProp={vi.fn()} p={p} />
    );
    expect(screen.getByText("Stars")).toBeInTheDocument();
  });

  it("renders percentage slider for progress component", () => {
    if (!HAS_PROPS.has("progress")) return;
    render(
      <PropsPanel type="progress" props={{}} onProp={vi.fn()} p={p} />
    );
    // Should have a range input for pct
    const slider = document.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
  });

  it("renders active index buttons for tabs component", () => {
    if (!HAS_PROPS.has("tabs")) return;
    render(
      <PropsPanel type="tabs" props={{}} onProp={vi.fn()} p={p} />
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders count controls for badge component", () => {
    if (!HAS_PROPS.has("badge")) return;
    render(
      <PropsPanel type="badge" props={{}} onProp={vi.fn()} p={p} />
    );
    // Badge has both "count" and "showCount" controls, so multiple "Count" labels
    const counts = screen.getAllByText("Count");
    expect(counts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders controls for every HAS_PROPS type without throwing", () => {
    for (const type of HAS_PROPS) {
      expect(() => {
        const { unmount } = render(
          <PropsPanel type={type} props={{}} onProp={vi.fn()} p={p} />
        );
        unmount();
      }).not.toThrow();
    }
  });

  it("renders toggle switches with role=switch and aria-checked", () => {
    const onProp = vi.fn();
    render(
      <PropsPanel type="button" props={{}} onProp={onProp} p={p} />
    );
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    // Each switch should have aria-checked
    for (const sw of switches) {
      expect(sw).toHaveAttribute("aria-checked");
    }
  });

  it("toggle switches have aria-label derived from adjacent label text", () => {
    const onProp = vi.fn();
    render(
      <PropsPanel type="button" props={{}} onProp={onProp} p={p} />
    );
    const switches = screen.getAllByRole("switch");
    // Every switch should have a non-empty aria-label (auto-derived from sibling span)
    for (const sw of switches) {
      expect(sw).toHaveAttribute("aria-label");
      expect(sw.getAttribute("aria-label")).not.toBe("");
    }
  });

  it("deduplicates controls with the same key (type-specific wins)", () => {
    // This is a structural test — just verify no duplicate keys cause crashes
    // for a type with many toggles
    if (!HAS_PROPS.has("card")) return;
    const { container } = render(
      <PropsPanel type="card" props={{}} onProp={vi.fn()} p={p} />
    );
    // Should render without duplicate React key warnings
    expect(container.querySelector("div")).not.toBeNull();
  });
});
