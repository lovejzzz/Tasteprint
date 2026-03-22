import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LIB, PAL } from "../constants";

// Mock ComponentRenderer to avoid rendering all 40+ heavy component types
vi.mock("../components/ComponentRenderer", () => ({
  default: function MockC({ type }) {
    return <div data-testid={`mock-c-${type}`}>{type}</div>;
  },
}));

// Import after mock is set up
const { default: LibrarySidebar } = await import("../components/LibrarySidebar");

const p = PAL.warm;
const catItems = LIB[0].items; // Starter category items

function makeProps(overrides = {}) {
  return {
    expCat: "Starter",
    setExpCat: vi.fn(),
    catItems,
    prefV: {},
    p,
    pDrag: null,
    setPDrag: vi.fn(),
    dRef: { current: null },
    reorderLib: vi.fn(),
    lastReorder: { current: 0 },
    ...overrides,
  };
}

describe("LibrarySidebar", () => {
  it("renders without crashing", () => {
    const { container } = render(<LibrarySidebar {...makeProps()} />);
    expect(container.querySelector("aside")).toBeInTheDocument();
  });

  it("renders all LIB category tabs", () => {
    render(<LibrarySidebar {...makeProps()} />);
    for (const cat of LIB) {
      expect(screen.getByText(cat.cat)).toBeInTheDocument();
    }
  });

  it("renders component cards for the active category", () => {
    render(<LibrarySidebar {...makeProps()} />);
    for (const item of catItems) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
    }
  });

  it("calls setExpCat when a category tab is clicked", () => {
    const props = makeProps();
    render(<LibrarySidebar {...props} />);
    const secondCat = LIB[1].cat;
    fireEvent.click(screen.getByText(secondCat));
    expect(props.setExpCat).toHaveBeenCalledWith(secondCat);
  });

  it("has correct ARIA roles", () => {
    render(<LibrarySidebar {...makeProps()} />);
    expect(screen.getByRole("complementary", { name: /component library/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /component categories/i })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: /starter components/i })).toBeInTheDocument();
  });

  it("marks active category tab as selected", () => {
    render(<LibrarySidebar {...makeProps()} />);
    const starterTab = screen.getByText("Starter").closest("[role='tab']");
    expect(starterTab).toHaveAttribute("aria-selected", "true");
  });

  it("component cards are draggable", () => {
    render(<LibrarySidebar {...makeProps()} />);
    const firstCard = screen.getByLabelText(new RegExp(catItems[0].label));
    expect(firstCard).toHaveAttribute("draggable", "true");
  });

  it("component cards have listitem role", () => {
    render(<LibrarySidebar {...makeProps()} />);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBe(catItems.length);
  });
});
