import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PAL } from "../constants";

// Mock ComponentRenderer to avoid heavy rendering
vi.mock("../components/ComponentRenderer", () => ({
  default: function MockC({ type }) {
    return <div data-testid={`mock-c-${type}`}>{type}</div>;
  },
}));

const { default: PickyOverlay } = await import("../components/PickyOverlay");

const p = PAL.warm;

function makePicky(overrides = {}) {
  return {
    phase: "template",
    template: null,
    step: 0,
    totalSteps: 0,
    options: [],
    picks: new Map(),
    currentSlot: null,
    sessionMood: "bold",
    enterPicky: vi.fn(),
    selectTemplate: vi.fn(),
    enterCustom: vi.fn(),
    confirmCustom: vi.fn(),
    selectMood: vi.fn(),
    quickStart: vi.fn(),
    pickOption: vi.fn(),
    skipSlot: vi.fn(),
    prevStep: vi.fn(),
    regenerate: vi.fn(),
    clearCache: vi.fn(),
    goToStep: vi.fn(),
    assemble: vi.fn(() => []),
    addSlot: vi.fn(),
    remix: vi.fn(),
    cancelPicky: vi.fn(),
    ...overrides,
  };
}

describe("PickyOverlay", () => {
  it("renders template picker in template phase", () => {
    const picky = makePicky({ phase: "template" });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Pick a page type")).toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("template cards show slot preview tags", () => {
    const picky = makePicky({ phase: "template" });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const tags = container.querySelectorAll(".tp-picky-template-slot-tag");
    // Should have tags for all slots across all templates
    expect(tags.length).toBeGreaterThan(0);
    // First landing template has "Navigation" as first slot → abbreviated to "Navig…"
    expect(tags[0].textContent.length).toBeLessThanOrEqual(6);
  });

  it("calls selectTemplate when template card is clicked", () => {
    const picky = makePicky({ phase: "template" });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Landing Page"));
    expect(picky.selectTemplate).toHaveBeenCalledWith("landing");
  });

  it("template phase shows Build Your Own button that calls enterCustom", () => {
    const picky = makePicky({ phase: "template" });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Build Your Own"));
    expect(picky.enterCustom).toHaveBeenCalled();
  });

  it("custom phase renders component type checklist", () => {
    const picky = makePicky({ phase: "custom" });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Build your own template")).toBeInTheDocument();
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders mood picker in mood phase", () => {
    const picky = makePicky({ phase: "mood", template: { id: "landing", label: "Landing Page", slots: [] } });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Set the vibe")).toBeInTheDocument();
    expect(screen.getByText("Minimal")).toBeInTheDocument();
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("Surprise me")).toBeInTheDocument();
  });

  it("calls selectMood when mood card is clicked", () => {
    const picky = makePicky({ phase: "mood", template: { id: "landing", label: "Landing Page", slots: [] } });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Elegant"));
    expect(picky.selectMood).toHaveBeenCalledWith("elegant");
  });

  it("calls selectMood with surprise when Surprise me is clicked", () => {
    const picky = makePicky({ phase: "mood", template: { id: "landing", label: "Landing Page", slots: [] } });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Surprise me"));
    expect(picky.selectMood).toHaveBeenCalledWith("surprise");
  });

  it("renders option cards in picking phase", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0,
      totalSteps: 1,
      options,
      currentSlot: { type: "hero", label: "Hero Section" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Hero Section")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 1: Hero Section")).toBeInTheDocument();
    // Should render mood labels
    expect(screen.getByText("Minimal")).toBeInTheDocument();
    expect(screen.getByText("Bold")).toBeInTheDocument();
  });

  it("shows variant names alongside mood labels on cards", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 4, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 5, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    // hero variant 0 = "Gradient", variant 4 = "Glass"
    expect(screen.getByText("Gradient")).toBeInTheDocument();
    expect(screen.getByText("Glass")).toBeInTheDocument();
  });

  it("calls pickOption when option card is clicked", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "button", label: "CTA" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "button", label: "CTA" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    // Click the second option card
    const cards = document.querySelectorAll(".tp-picky-card");
    fireEvent.click(cards[1]);
    expect(picky.pickOption).toHaveBeenCalledWith(1);
  });

  it("renders done phase with Build Page button", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    const picky = makePicky({
      phase: "done",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      totalSteps: 1,
      picks,
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Your page is ready!")).toBeInTheDocument();
    expect(screen.getByText("Build Page")).toBeInTheDocument();
  });

  it("calls onExit with assembled shapes when Build Page clicked", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    const assembled = [{ id: "x", type: "hero" }];
    const onExit = vi.fn();
    const picky = makePicky({
      phase: "done",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      totalSteps: 1,
      picks,
      assemble: vi.fn(() => assembled),
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={onExit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Build Page"));
    expect(picky.assemble).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledWith(assembled);
  });

  it("done phase shows Export PNG button", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    const picky = makePicky({
      phase: "done",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      totalSteps: 1,
      picks,
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Export PNG")).toBeInTheDocument();
  });

  it("done phase shows Remix button that calls picky.remix", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    const picky = makePicky({
      phase: "done",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      totalSteps: 1,
      picks,
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const remixBtn = screen.getByText("Remix");
    expect(remixBtn).toBeInTheDocument();
    fireEvent.click(remixBtn);
    expect(picky.remix).toHaveBeenCalled();
  });

  it("calls onCancel from template phase", () => {
    const onCancel = vi.fn();
    const picky = makePicky({ phase: "template" });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls skipSlot from picking phase", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Skip"));
    expect(picky.skipSlot).toHaveBeenCalled();
  });

  it("shows live assembly preview when picks exist", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picks = new Map();
    picks.set(0, options[1]); // picked slot 0
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [
        { type: "navbar", label: "Navigation" },
        { type: "hero", label: "Hero" },
      ]},
      step: 1, totalSteps: 2, options, picks,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    // Preview strip should be rendered
    const strip = container.querySelector(".tp-picky-preview");
    expect(strip).not.toBeNull();
    // Should have 2 slot placeholders (one picked, one pending)
    const slots = container.querySelectorAll(".tp-picky-preview-slot");
    expect(slots.length).toBe(2);
  });

  it("clicking a preview-strip thumbnail calls goToStep for undo/re-pick", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picks = new Map();
    picks.set(0, options[1]);
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [
        { type: "navbar", label: "Navigation" },
        { type: "hero", label: "Hero" },
      ]},
      step: 1, totalSteps: 2, options, picks,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const slots = container.querySelectorAll(".tp-picky-preview-slot");
    expect(slots.length).toBe(2);
    // Click the first slot (already picked) to go back and re-pick
    fireEvent.click(slots[0]);
    expect(picky.goToStep).toHaveBeenCalledWith(0);
  });

  it("option cards have staggered entrance animation wrappers", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const wrappers = container.querySelectorAll(".tp-picky-card-enter");
    expect(wrappers.length).toBe(4);
    // Check staggered delays
    expect(wrappers[0].style.animationDelay).toBe("0ms");
    expect(wrappers[1].style.animationDelay).toBe("70ms");
    expect(wrappers[2].style.animationDelay).toBe("140ms");
    expect(wrappers[3].style.animationDelay).toBe("210ms");
  });

  it("does not show live preview when no picks yet", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const strip = container.querySelector(".tp-picky-preview");
    expect(strip).toBeNull();
  });

  it("calls regenerate when Shuffle button is clicked", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
      regenerate: vi.fn(),
    clearCache: vi.fn(),
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("Shuffle"));
    expect(picky.regenerate).toHaveBeenCalled();
  });

  it("returns null when phase is idle", () => {
    const picky = makePicky({ phase: "idle" });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("keyboard shortcut 1-4 calls pickOption", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
    expect(picky.pickOption).toHaveBeenCalledWith(1);
  });

  it("keyboard R calls regenerate, S calls skipSlot, B calls prevStep", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }, { type: "card", label: "Card" }] },
      step: 1, totalSteps: 2, options,
      currentSlot: { type: "card", label: "Card" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true }));
    expect(picky.regenerate).toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", bubbles: true }));
    expect(picky.skipSlot).toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
    expect(picky.prevStep).toHaveBeenCalled();
  });

  it("shows keyboard hints on desktop", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const hint = container.querySelector(".tp-picky-kbd-hint");
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain("pick");
    expect(hint.textContent).toContain("shuffle");
  });

  it("clicking a progress dot calls goToStep", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [
        { type: "navbar", label: "Navigation" },
        { type: "hero", label: "Hero" },
        { type: "card", label: "Card" },
      ]},
      step: 2, totalSteps: 3, options,
      currentSlot: { type: "card", label: "Card" },
    });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    // Click the first dot (step 0)
    const dots = screen.getAllByRole("tab");
    expect(dots.length).toBe(3);
    fireEvent.click(dots[0]);
    expect(picky.goToStep).toHaveBeenCalledWith(0);
  });

  it("renders quick presets in template phase and calls quickStart on click", () => {
    const picky = makePicky({ phase: "template" });
    render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    const presetBtn = screen.getByText("Minimal Landing");
    expect(presetBtn).toBeInTheDocument();
    fireEvent.click(presetBtn);
    expect(picky.quickStart).toHaveBeenCalledWith("landing", "minimal");
  });

  it("done phase shows responsive preview with Desktop/Phone toggle", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    const picky = makePicky({
      phase: "done",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      totalSteps: 1,
      picks,
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />);
    // Should have device toggle buttons
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    // Should have a page preview
    const preview = container.querySelector(".tp-picky-page-preview");
    expect(preview).not.toBeNull();
    // Click Phone to switch
    fireEvent.click(screen.getByText("Phone"));
    // Preview should still exist (re-rendered for phone)
    expect(container.querySelector(".tp-picky-page-preview")).not.toBeNull();
  });

  it("done phase preview defaults to Phone when device is phone", () => {
    const picks = new Map();
    picks.set(0, { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {} });
    const picky = makePicky({
      phase: "done",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      totalSteps: 1,
      picks,
    });
    const { container } = render(<PickyOverlay picky={picky} p={p} mobile={false} device="phone" onExit={vi.fn()} onCancel={vi.fn()} />);
    // Phone button should have the active style (background = p.su)
    const phoneBtn = screen.getByText("Phone");
    expect(phoneBtn.className).toContain("tp-picky-device-btn--active");
    // Desktop should not be active
    const desktopBtn = screen.getByText("Desktop");
    expect(desktopBtn.className).not.toContain("tp-picky-device-btn--active");
    // Preview should use phone border-radius (16)
    const preview = container.querySelector(".tp-picky-page-preview");
    expect(preview.style.borderRadius).toBe("16px");
  });

  it("picking phase shows palette swatches that call setPal and clearCache", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const setPal = vi.fn();
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(
      <PickyOverlay picky={picky} p={p} pal="warm" setPal={setPal} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />
    );
    const swatches = container.querySelectorAll(".tp-picky-palette-swatch");
    expect(swatches.length).toBeGreaterThan(0);
    // Click a non-active swatch (second one)
    fireEvent.click(swatches[1]);
    expect(setPal).toHaveBeenCalled();
    expect(picky.clearCache).toHaveBeenCalled();
  });

  it("picking phase step counter has aria-live for screen reader announcements", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }, { type: "card", label: "Cards" }] },
      step: 0, totalSteps: 2, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(
      <PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />
    );
    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).not.toBeNull();
    expect(liveRegion.textContent).toContain("Step 1 of 2");
    expect(liveRegion.textContent).toContain("Hero");
    expect(liveRegion.getAttribute("aria-atomic")).toBe("true");
  });

  it("Shift+click on two cards shows compare overlay", () => {
    const options = [
      { variant: 0, font: 0, fsize: 1, props: {}, dStyles: {}, mood: "minimal" },
      { variant: 1, font: 1, fsize: 1, props: {}, dStyles: {}, mood: "bold" },
      { variant: 2, font: 2, fsize: 1, props: {}, dStyles: {}, mood: "elegant" },
      { variant: 3, font: 3, fsize: 1, props: {}, dStyles: {}, mood: "playful" },
    ];
    const picky = makePicky({
      phase: "picking",
      template: { id: "landing", slots: [{ type: "hero", label: "Hero" }] },
      step: 0, totalSteps: 1, options,
      currentSlot: { type: "hero", label: "Hero" },
    });
    const { container } = render(
      <PickyOverlay picky={picky} p={p} mobile={false} device="desktop" onExit={vi.fn()} onCancel={vi.fn()} />
    );
    const cards = container.querySelectorAll(".tp-picky-card");
    // Shift+click two cards
    fireEvent.click(cards[0], { shiftKey: true });
    fireEvent.click(cards[2], { shiftKey: true });
    // Compare overlay should appear
    const compare = container.querySelector(".tp-picky-compare");
    expect(compare).not.toBeNull();
    expect(screen.getByText("Compare — click one to pick")).toBeInTheDocument();
    // Options should be dimmed
    expect(container.querySelector(".tp-picky-options--dimmed")).not.toBeNull();
  });
});
