import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LIB, PAL } from "../constants";

// Mock ComponentRenderer to avoid rendering all 40+ heavy component types
vi.mock("../components/ComponentRenderer", () => ({
  default: function MockC({ type }) {
    return <div data-testid={`mock-c-${type}`}>{type}</div>;
  },
}));

const { default: MobileDrawer } = await import("../components/MobileDrawer");

const p = PAL.warm;
const catItems = LIB[0].items; // Starter category

function makeProps(overrides = {}) {
  return {
    libOpen: false,
    setLibOpen: vi.fn(),
    expCat: "Starter",
    setExpCat: vi.fn(),
    catItems,
    prefV: {},
    p,
    viewportWidth: 390,
    addShape: vi.fn(),
    ...overrides,
  };
}

describe("MobileDrawer", () => {
  it("renders FAB button", () => {
    render(<MobileDrawer {...makeProps()} />);
    expect(screen.getByLabelText("Open library")).toBeInTheDocument();
  });

  it("FAB label changes when open", () => {
    render(<MobileDrawer {...makeProps({ libOpen: true })} />);
    expect(screen.getByLabelText("Close library")).toBeInTheDocument();
  });

  it("FAB toggles drawer open", () => {
    const setLibOpen = vi.fn();
    render(<MobileDrawer {...makeProps({ setLibOpen })} />);
    fireEvent.click(screen.getByLabelText("Open library"));
    expect(setLibOpen).toHaveBeenCalledWith(true);
  });

  it("shows backdrop when open", () => {
    const setLibOpen = vi.fn();
    const { container } = render(<MobileDrawer {...makeProps({ libOpen: true, setLibOpen })} />);
    // Backdrop is the div with inset:0 (covers entire screen)
    const backdrop = container.querySelector('div[style*="inset"]');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop);
    expect(setLibOpen).toHaveBeenCalledWith(false);
  });

  it("renders category tabs", () => {
    render(<MobileDrawer {...makeProps({ libOpen: true })} />);
    for (const cat of LIB) {
      expect(screen.getByText(cat.cat)).toBeInTheDocument();
    }
  });

  it("switches category on tab click", () => {
    const setExpCat = vi.fn();
    render(<MobileDrawer {...makeProps({ libOpen: true, setExpCat })} />);
    const secondCat = LIB[1].cat;
    fireEvent.click(screen.getByText(secondCat));
    expect(setExpCat).toHaveBeenCalledWith(secondCat);
  });

  it("renders component cards for catItems", () => {
    render(<MobileDrawer {...makeProps({ libOpen: true })} />);
    for (const item of catItems) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("calls addShape and closes drawer on card click", () => {
    const addShape = vi.fn();
    const setLibOpen = vi.fn();
    render(<MobileDrawer {...makeProps({ libOpen: true, addShape, setLibOpen })} />);
    fireEvent.click(screen.getByText(catItems[0].label));
    expect(addShape).toHaveBeenCalledWith(catItems[0]);
    expect(setLibOpen).toHaveBeenCalledWith(false);
  });

  it("drawer has dialog role and aria-label", () => {
    render(<MobileDrawer {...makeProps({ libOpen: true })} />);
    expect(screen.getByRole("dialog", { name: "Component library" })).toBeInTheDocument();
  });

  it("drawer is aria-hidden when closed", () => {
    const { container } = render(<MobileDrawer {...makeProps({ libOpen: false })} />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute("aria-hidden", "true");
  });

  it("category tabs have tablist/tab roles with aria-selected", () => {
    render(<MobileDrawer {...makeProps({ libOpen: true })} />);
    expect(screen.getByRole("tablist", { name: "Component categories" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(LIB.length);
    // Active tab (Starter) should be selected
    const activeTab = screen.getByRole("tab", { name: "Starter" });
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    // Other tabs should not be selected
    const otherTab = screen.getByRole("tab", { name: LIB[1].cat });
    expect(otherTab).toHaveAttribute("aria-selected", "false");
  });

  it("component grid has tabpanel role", () => {
    render(<MobileDrawer {...makeProps({ libOpen: true })} />);
    expect(screen.getByRole("tabpanel", { name: "Starter components" })).toBeInTheDocument();
  });
});
